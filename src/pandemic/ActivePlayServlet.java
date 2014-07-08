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

	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
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
