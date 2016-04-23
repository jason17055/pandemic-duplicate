package pandemic;

import java.io.*;
import javax.servlet.http.*;
import com.fasterxml.jackson.core.*;
import com.google.appengine.api.channel.*;
import com.google.appengine.api.datastore.*;
import java.util.*;
import java.util.logging.Logger;

import static pandemic.PandemicDealServlet.getRequestContent;
import static pandemic.PandemicDealServlet.MAX_PLAYERS;
import static pandemic.HelperFunctions.*;

public class ActivePlayServlet extends HttpServlet
{
	private static final Logger log = Logger.getLogger(ActivePlayServlet.class.getName());

	@Override
	public void doGet(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String tmp = req.getParameter("search_player");
		if (tmp != null) {
			doSearchGames(tmp, req, resp);
			return;
		}

		resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
		return;
	}

	void doSearchGames(String qry, HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Query q = new Query("Play");
		Query.Filter f1 = new Query.FilterPredicate("playerNamesLC", Query.FilterOperator.EQUAL, qry.toLowerCase());
		Query.Filter f2 = new Query.FilterPredicate("created", Query.FilterOperator.GREATER_THAN_OR_EQUAL, new Date(
			System.currentTimeMillis()-60*60*1000));
		q = q.setFilter(
			Query.CompositeFilterOperator.and(f1, f2)
			);
		q = q.addSort("created", Query.SortDirection.DESCENDING);
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
			String id = ent.getKey().getName();
			out.writeStringField("id", id);
			String scenario_id = (String) ent.getProperty("scenario");
			out.writeStringField("deal", scenario_id);
			out.writeStringField("scenario", scenario_id);
			out.writeStringField("scenario_id", scenario_id);

			List<?> l = (List<?>) ent.getProperty("playerNames");
			out.writeFieldName("players");
			out.writeStartArray();
			for (Object o : l) {
				out.writeString((String) o);
			}
			out.writeEndArray();

			if (ent.hasProperty("location")) {
				String location = ent.getProperty("location").toString();
				out.writeStringField("location", location);
			}

			out.writeEndObject();
		}

		out.writeEndArray();
		out.writeEndObject();
		out.close();
	}

	void doPostGameState(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String game_id = req.getParameter("id");
		log.info("new game state received for "+game_id);

		ArrayList<String> moves = new ArrayList<String>();
		int curTime = 0;
		String givenSecret = "";

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
			else if (json.getCurrentName().equals("secret")) {
				json.nextToken();
				givenSecret = json.getText();
			}
		}

		ChannelService channelService = ChannelServiceFactory.getChannelService();
		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Transaction txn = datastore.beginTransaction();

		try
		{
			Key pkey = KeyFactory.createKey("Play", game_id);
			Entity playEnt = datastore.get(pkey);

			// check whether this client is authorized
			String expectedSecret = (String) playEnt.getProperty("secret");
			if (!givenSecret.equals(expectedSecret)) {
				if (givenSecret.length() != 0 && expectedSecret != null && expectedSecret.length() != 0) {
					log.info("wrong secret given");
				}
				else if (givenSecret.length() != 0) {
					log.info("datastore does not have a secret for this game");
				}
				else {
					log.info("no secret provided");
				}

				writeErrorResponse(resp,
					HttpServletResponse.SC_UNAUTHORIZED,
					"Not authorized"
					);
				return;
			}

			Entity ent = new Entity("GameState", 1, pkey);

			Date createdDate = new Date();
			String creatorIp = req.getRemoteAddr();

			ent.setProperty("created", createdDate);
			ent.setProperty("createdBy", creatorIp);

			ent.setProperty("time", curTime);
			ent.setProperty("moves", moves);

			datastore.put(ent);

			Query q = new Query("Subscriber");
			q = q.setAncestor(pkey);
			PreparedQuery pq = datastore.prepare(q);

			String msgString = makeChannelMessage(game_id, moves);
			for (Entity subscriberEnt : pq.asIterable()) {
				String channelKey = Long.toString(subscriberEnt.getKey().getId());
				channelService.sendMessage(
					new ChannelMessage(channelKey, msgString)
					);
			}

			txn.commit();

			JsonGenerator out = new JsonFactory().
				createJsonGenerator(resp.getWriter());
			out.writeStartObject();
			out.writeStringField("status", "ok");
			out.writeEndObject();
			out.close();
		}
		catch (EntityNotFoundException e) {
			log.info("play "+game_id+" not found");
			resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
			return;
		}
		finally {
			if (txn.isActive()) {
				txn.rollback();
			}
		}
	}

	String makeChannelMessage(String game_id, List<String> moves)
		throws IOException
	{
		StringWriter sw = new StringWriter();
		JsonGenerator out = new JsonFactory().
			createJsonGenerator(sw);

		out.writeStartObject();
		out.writeStringField("game_id", game_id);
		out.writeFieldName("moves");
		out.writeStartArray();
		for (String mv : moves) {
			out.writeString(mv);
		}
		out.writeEndArray();
		out.writeEndObject();
		out.close();

		return sw.toString();
	}

	void doPostSubscribe(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String play_id = req.getParameter("subscribe");
		log.info("want to subscribe to "+play_id);

		ChannelService channelService = ChannelServiceFactory.getChannelService();
		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();

		Key pkey = KeyFactory.createKey("Play", play_id);
		String dealId;
		List<String> playerNames;
		try {
			Entity pEnt = datastore.get(pkey);
			dealId = (String) pEnt.getProperty("deal");

			@SuppressWarnings("unchecked")
			List<String> tmpList = (List<String>) pEnt.getProperty("playerNames");
			playerNames = tmpList;
		}
		catch (EntityNotFoundException e) {
			// can't subscribe to a play that doesn't exist
			resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
			return;
		}

		@SuppressWarnings("unchecked")
		List<String> moves = Collections.emptyList();
		boolean gameFound;

		try
		{
			Key gskey = KeyFactory.createKey(pkey, "GameState", 1);
			Entity gsEnt = datastore.get(gskey);
			gameFound = true;

			if (gsEnt.hasProperty("moves")) {
				@SuppressWarnings("unchecked")
				List<String> tmpList = (List<String>) gsEnt.getProperty("moves");
				if (tmpList != null) {
					moves = tmpList;
					log.info("found "+moves.size()+" moves");
				}
			}
		}
		catch (EntityNotFoundException e) {
			// ok; the game exists, but no moves have been
			// uploaded yet
			gameFound = false;
		}

		Transaction txn = datastore.beginTransaction();
		try
		{
			Entity ent = new Entity("Subscriber", pkey);

			Date createdDate = new Date();
			String creatorIp = req.getRemoteAddr();

			ent.setProperty("created", createdDate);
			ent.setProperty("createdBy", creatorIp);

			Key skey = datastore.put(ent);

			txn.commit();

log.info("created subscription "+skey.getId());

			String channelKey = Long.toString(skey.getId());
			String channelToken = channelService.createChannel(channelKey);

			JsonGenerator out = new JsonFactory().
				createJsonGenerator(resp.getWriter());
			out.writeStartObject();
			out.writeStringField("status", "ok");
			out.writeStringField("subscriber_id", Long.toString(skey.getId()));
			out.writeStringField("channel", channelToken);

			out.writeFieldName("game");
			out.writeStartObject();

			out.writeStringField("deal", dealId);
			out.writeStringField("scenario_id", dealId);
			out.writeFieldName("players");
			out.writeStartArray();
			for (String nm : playerNames) {
				out.writeString(nm);
			}
			out.writeEndArray();

			out.writeBooleanField("started", gameFound);
			out.writeFieldName("moves");
			out.writeStartArray();
			for (String mv : moves) {
				out.writeString(mv);
			}
			out.writeEndArray(); //end "moves" array
			out.writeEndObject(); //end "game" object
			out.writeEndObject(); //end response object
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
			String post = req.getParameter("post");
			if (post != null && post.equals("meta")) {
				doPostGameMeta(req, resp);
			}
			else {
				doPostGameState(req, resp);
			}
			return;
		}

		resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
		return;
	}

	void doPostGameMeta(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String gameId = req.getParameter("id");

		String content = getRequestContent(req);
		JsonParser json = new JsonFactory().
			createJsonParser(new StringReader(content));

		class NewGameInfo {
			String deal_id;
			int player_count;
			String [] player_names = new String[MAX_PLAYERS];
			String location;
			String secret;
			String tournament;
			String tournamentEvent;
		}
		NewGameInfo ngi = new NewGameInfo();
		for (int i = 0; i < MAX_PLAYERS; i++) {
			ngi.player_names[i] = "";
		}

		while (json.nextToken() != null) {
			if (json.getCurrentToken() != JsonToken.FIELD_NAME) { continue; }

			if (json.getCurrentName().equals("deal")) {
				json.nextToken();
				ngi.deal_id = json.getText();
			}
			else if (json.getCurrentName().equals("scenario")) {
				json.nextToken();
				ngi.deal_id = json.getText();
			}
			else if (json.getCurrentName().equals("location")) {
				json.nextToken();
				ngi.location = json.getText();
			}
			else if (json.getCurrentName().equals("secret")) {
				json.nextToken();
				ngi.secret = json.getText();
			}
			else if (json.getCurrentName().equals("player_count")) {
				json.nextToken();
				if (json.getIntValue() <= MAX_PLAYERS) {
					ngi.player_count = json.getIntValue();
				}
			}
			else if (json.getCurrentName().equals("tournament_event")) {
				json.nextToken();
				String tmp = json.getText();
				int slash = tmp.indexOf('/');
				ngi.tournament = tmp.substring(0, slash);
				ngi.tournamentEvent = tmp.substring(slash + 1);
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
			else if (json.getCurrentName().equals("player5")) {
				json.nextToken();
				ngi.player_names[4] = json.getText();
			}
		}

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Transaction txn = datastore.beginTransaction();

		try
		{
			Key pkey = KeyFactory.createKey("Play", gameId);
			if (checkEntityExists(datastore, pkey)) {
				throw new AlreadyExists();
			}

			Entity ent = new Entity(pkey);

			Date createdDate = new Date();
			String creatorIp = req.getRemoteAddr();

			ent.setProperty("deal", ngi.deal_id);
			ent.setProperty("scenario", ngi.deal_id);
			ent.setProperty("secret", ngi.secret);
			ent.setProperty("player_count", new Integer(ngi.player_count));
			ent.setProperty("created", createdDate);
			ent.setProperty("createdBy", creatorIp);
			if (ngi.location != null) {
				ent.setProperty("location", ngi.location);
			}

			ent.setProperty("playerNames", Arrays.asList(ngi.player_names).subList(0, ngi.player_count));
			ArrayList<String> tmp = new ArrayList<String>();
			for (int i = 0; i < ngi.player_count; i++) {
				tmp.add(ngi.player_names[i].toLowerCase());
			}
			ent.setProperty("playerNamesLC", tmp);

			if (ngi.tournament != null) {
				Key key = KeyFactory.createKey("Tournament", ngi.tournament);
				ent.setProperty("tournament", key);

				if (ngi.tournamentEvent != null) {
					Key ekey = KeyFactory.createKey(key, "TournamentEvent", Long.parseLong(ngi.tournamentEvent));
					ent.setProperty("tournamentEvent", ekey);
				}
			}

			datastore.put(ent);

			txn.commit();

			JsonGenerator out = new JsonFactory().
				createJsonGenerator(resp.getWriter());
			out.writeStartObject();
			out.writeStringField("status", "ok");
			out.writeStringField("game_id", gameId);
			out.writeEndObject();
			out.close();
		}
		catch (AlreadyExists e) {
			writeErrorResponse(resp,
				HttpServletResponse.SC_CONFLICT,
				"Already exists.");
		}
		finally {
			if (txn.isActive()) {
				txn.rollback();
			}
		}
	}
}
