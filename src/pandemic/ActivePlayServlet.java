package pandemic;

import java.io.*;
import javax.servlet.http.*;
import com.fasterxml.jackson.core.*;
import com.google.appengine.api.datastore.*;
import java.util.*;
import java.util.logging.Logger;

import static pandemic.PandemicDealServlet.getRequestContent;

public class ActivePlayServlet extends HttpServlet
{
	private static final Logger log = Logger.getLogger(ActivePlayServlet.class.getName());
	static final int MAX_PLAYERS = 4;

	@Override
	public void doGet(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String tmp = req.getParameter("search_player");
		if (tmp != null) {
			doSearchGames(tmp, req, resp);
			return;
		}

		//TODO
	}

	void doSearchGames(String qry, HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Query q = new Query("Play");
		q = q.setFilter(
			new Query.FilterPredicate("playerNamesLC", Query.FilterOperator.EQUAL, qry.toLowerCase())
			);
		PreparedQuery pq = datastore.prepare(q);

		resp.setContentType("text/json;charset=UTF-8");
		JsonGenerator out = new JsonFactory().
			createJsonGenerator(resp.getWriter()
			);
		out.writeStartObject();
		out.writeFieldName("results");
		out.writeStartArray();

		for (Entity ent : pq.asIterable()) {
			out.writeStartObject();
			String id = Long.toString(ent.getKey().getId());
			out.writeStringField("id", id);
			String deal_id = (String) ent.getProperty("deal");
			out.writeStringField("deal", deal_id);

			List<?> l = (List<?>) ent.getProperty("playerNames");
			out.writeFieldName("players");
			out.writeStartArray();
			for (Object o : l) {
				out.writeString((String) o);
			}
			out.writeEndArray();

			out.writeEndObject();
		}

		out.writeEndArray();
		out.writeEndObject();
		out.close();
	}

	void doPostGameState(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String play_id = req.getParameter("id");
		log.info("new game state received for "+play_id);

		ArrayList<String> moves = new ArrayList<String>();
		int curTime = 0;

		JsonParser json = new JsonFactory().
			createJsonParser(new StringReader(
				getRequestContent(req)));
		while (json.nextToken() != null) {
			if (json.getCurrentToken() != JsonToken.FIELD_NAME) { continue; }

			if (json.getCurrentName().equals("time")) {
				json.nextToken();
				curTime = json.getIntValue();
			}
			else if (json.getCurrentName().equals("moves")) {
				json.nextToken(); // expected: start array
				while (json.nextToken() != JsonToken.END_ARRAY) {
					String s = json.getText();
					moves.add(s);
				}
			}
		}

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Transaction txn = datastore.beginTransaction();

		try
		{
			Key pkey = KeyFactory.createKey("Play", Long.parseLong(play_id));
			Entity playEnt = datastore.get(pkey);

			//TODO- check whether this client is authorized

			Entity ent = new Entity("GameState", 1, pkey);

			Date createdDate = new Date();
			String creatorIp = req.getRemoteAddr();

			ent.setProperty("created", createdDate);
			ent.setProperty("createdBy", creatorIp);

			ent.setProperty("time", curTime);
			ent.setProperty("moves", moves);

			datastore.put(ent);

			txn.commit();

			JsonGenerator out = new JsonFactory().
				createJsonGenerator(resp.getWriter());
			out.writeStartObject();
			out.writeStringField("status", "ok");
			out.writeEndObject();
			out.close();
		}
		catch (EntityNotFoundException e) {
			log.info("play "+play_id+" not found");
			resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
		}
		finally {
			if (txn.isActive()) {
				txn.rollback();
			}
		}
	}

	void doPostSubscribe(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String play_id = req.getParameter("subscribe");
		log.info("want to subscribe to "+play_id);

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Transaction txn = datastore.beginTransaction();

		try
		{
			Key pkey = KeyFactory.createKey("Play", play_id);
			Entity ent = new Entity("Subscriber", pkey);

			Date createdDate = new Date();
			String creatorIp = req.getRemoteAddr();

			ent.setProperty("created", createdDate);
			ent.setProperty("createdBy", creatorIp);

			Key skey = datastore.put(ent);

			txn.commit();

log.info("created subscription "+skey.getId());
			JsonGenerator out = new JsonFactory().
				createJsonGenerator(resp.getWriter());
			out.writeStartObject();
			out.writeStringField("status", "ok");
			out.writeStringField("subscriber_id", Long.toString(skey.getId()));
			out.writeEndObject();
			out.close();
		}
		finally {
			if (txn.isActive()) {
				txn.rollback();
			}
		}
	}

	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		if (req.getParameter("subscribe") != null) {
			doPostSubscribe(req, resp);
			return;
		}
		else if (req.getParameter("id") != null) {
			doPostGameState(req, resp);
			return;
		}

		String content = getRequestContent(req);
		JsonParser json = new JsonFactory().
			createJsonParser(new StringReader(content));

		class NewGameInfo {
			String deal_id;
			int player_count;
			String [] player_names = new String[MAX_PLAYERS];
		}
		NewGameInfo ngi = new NewGameInfo();
		while (json.nextToken() != null) {
			if (json.getCurrentToken() != JsonToken.FIELD_NAME) { continue; }

			if (json.getCurrentName().equals("deal")) {
				json.nextToken();
				ngi.deal_id = json.getText();
			}
			else if (json.getCurrentName().equals("player_count")) {
				json.nextToken();
				ngi.player_count = json.getIntValue();
			}
			else if (json.getCurrentName().equals("player1")) {
				json.nextToken();
				ngi.player_names[0] = json.getText();
			}
			else if (json.getCurrentName().equals("player2")) {
				json.nextToken();
				ngi.player_names[1] = json.getText();
			}
			else if (json.getCurrentName().equals("player3")) {
				json.nextToken();
				ngi.player_names[2] = json.getText();
			}
			else if (json.getCurrentName().equals("player4")) {
				json.nextToken();
				ngi.player_names[3] = json.getText();
			}
		}

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Transaction txn = datastore.beginTransaction();

		try
		{
			Entity ent = new Entity("Play");

			Date createdDate = new Date();
			String creatorIp = req.getRemoteAddr();

			ent.setProperty("deal", ngi.deal_id);
			ent.setProperty("player_count", new Integer(ngi.player_count));
			ent.setProperty("created", createdDate);
			ent.setProperty("createdBy", creatorIp);

			ent.setProperty("playerNames", Arrays.asList(ngi.player_names).subList(0, ngi.player_count));
			ArrayList<String> tmp = new ArrayList<String>();
			for (int i = 0; i < ngi.player_count; i++) {
				tmp.add(ngi.player_names[i].toLowerCase());
			}
			ent.setProperty("playerNamesLC", tmp);

			Key pkey = datastore.put(ent);

			txn.commit();

			JsonGenerator out = new JsonFactory().
				createJsonGenerator(resp.getWriter());
			out.writeStartObject();
			out.writeStringField("status", "ok");
			out.writeStringField("game_id", Long.toString(pkey.getId()));
			out.writeEndObject();
			out.close();
		}
		finally {
			if (txn.isActive()) {
				txn.rollback();
			}
		}
	}
}
