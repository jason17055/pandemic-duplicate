package pandemic;

import java.io.*;
import javax.servlet.http.*;
import com.fasterxml.jackson.core.*;
import com.google.appengine.api.datastore.*;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Properties;
import java.util.logging.Logger;
import javax.mail.*;
import javax.mail.internet.*;

import static pandemic.PandemicDealServlet.getRequestContent;
import static pandemic.PandemicDealServlet.MAX_PLAYERS;

public class PandemicResultServlet extends HttpServlet
{
	private static final Logger log = Logger.getLogger(PandemicResultServlet.class.getName());

	void doSearchResults(String qry, HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Query q = new Query("Result");
		Query.Filter f1 = new Query.FilterPredicate("playerNamesLC", Query.FilterOperator.EQUAL, qry.toLowerCase());
		Query.Filter f2 = new Query.FilterPredicate("locationLC", Query.FilterOperator.EQUAL, qry.toLowerCase());
		q = q.setFilter(
			Query.CompositeFilterOperator.or(f1, f2)
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
			String result_id = ent.getKey().getName();
			Key scenarioKey = (Key) ent.getProperty("scenario");
			String scenario_id = scenarioKey.getName();

			out.writeStringField("id", result_id);
			out.writeStringField("scenario", scenario_id);
			out.writeEndObject();
		}

		out.writeEndArray();
		out.writeEndObject();
		out.close();
	}

	void doGetResult(String result_id, HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		try {

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Key key = KeyFactory.createKey("Result", result_id);
		Entity ent = datastore.get(key);

		Text t = (Text) ent.getProperty("content");
		
		resp.setContentType("text/json;charset=UTF-8");
		Writer out = resp.getWriter();
		out.write(t.getValue());
		out.close();

		}
		catch (EntityNotFoundException e) {
			resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
			return;
		}
	}

	@Override
	public void doGet(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String tmp = req.getParameter("q");
		if (tmp != null) {
			doSearchResults(tmp, req, resp);
			return;
		}

		String resultId = req.getParameter("result");
		if (resultId != null) {
			doGetResult(resultId, req, resp);
			return;
		}

		resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
	}

	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String result_id = req.getParameter("result");
		if (result_id == null) {
			resp.sendError(HttpServletResponse.SC_BAD_REQUEST);
			return;
		}

		String content = getRequestContent(req);
		JsonParser json = new JsonFactory().
			createJsonParser(new StringReader(content));

		String gameId = null;
		String versionString = null;
		String rulesString = null;
		String scenarioId = null;
		int score = 0;
		String [] playerNames = new String[MAX_PLAYERS];
		String location = null;
		String tournamentEventInfo = null;

		while (json.nextToken() != null) {
			if (json.getCurrentToken() != JsonToken.FIELD_NAME) { continue; }

			String k = json.getCurrentName();
			if (k.equals("rules")) {
				json.nextToken();
				rulesString = json.getText();
			}
			else if (k.equals("game_id")) {
				json.nextToken();
				gameId = json.getText();
			}
			else if (k.equals("shuffle_id") || k.equals("scenario_id")) {
				json.nextToken();
				scenarioId = json.getText();
			}
			else if (k.equals("version")) {
				json.nextToken();
				versionString = json.getText();
			}
			else if (k.equals("score")) {
				json.nextToken();
				score = json.getCurrentToken() == JsonToken.VALUE_NUMBER_INT ?
						json.getIntValue() :
						Integer.parseInt(json.getText());
			}
			else if (k.matches("^player\\d+$")) {
				int pid = Integer.parseInt(k.substring(6));
				json.nextToken();
				if (pid >= 1 && pid <= MAX_PLAYERS) {
					playerNames[pid-1] = json.getText();
				}
			}
			else if (k.equals("location")) {
				json.nextToken();
				location = json.getText();
			}
			else if (k.equals("tournament_event")) {
				json.nextToken();
				tournamentEventInfo = json.getText();
			}
			else {
				// unrecognized
				json.nextToken();
				json.skipChildren();
			}
		}

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Transaction txn = datastore.beginTransaction();

		Key scenarioKey = KeyFactory.createKey("Scenario", scenarioId);

		try
		{
			Key key = KeyFactory.createKey("Result", result_id);
			Date createdDate = new Date();
			String creatorIp = req.getRemoteAddr();

			Entity ent = new Entity(key);
			ent.setProperty("content", new Text(content));
			ent.setProperty("version", versionString);
			ent.setProperty("rules", rulesString);
			ent.setProperty("score", new Integer(score));
			ent.setProperty("scenario", scenarioKey);

			if (location != null && location.length() != 0) {
				ent.setProperty("location", location);
				ent.setProperty("locationLC", location.toLowerCase());
			}

			if (gameId != null) {
				Key gameKey = KeyFactory.createKey("Play", gameId);
				ent.setProperty("game", gameKey);
			}

			if (tournamentEventInfo != null) {
				int slash = tournamentEventInfo.indexOf('/');
				String tournamentId = tournamentEventInfo.substring(0, slash);
				long eventId = Long.parseLong(tournamentEventInfo.substring(slash + 1));
				Key tournamentKey = KeyFactory.createKey("Tournament", tournamentId);
				Key eventKey = KeyFactory.createKey(tournamentKey, "TournamentEvent", eventId);
				ent.setProperty("tournament", tournamentKey);
				ent.setProperty("tournamentEvent", eventKey);
			}

			ArrayList<String> names1 = new ArrayList<String>();
			ArrayList<String> names2 = new ArrayList<String>();
			for (String s : playerNames) {
				if (s != null) {
					names1.add(s);
					names2.add(s.toLowerCase());
				}
			}
			ent.setProperty("playerNames", names1);
			ent.setProperty("playerNamesLC", names2);

			ent.setProperty("created", createdDate);
			ent.setProperty("createdBy", creatorIp);

			datastore.put(ent);
			txn.commit();

			resp.setContentType("text/json;charset=UTF-8");
			JsonGenerator out = new JsonFactory().
				createJsonGenerator(resp.getWriter());
			out.writeStartObject();
			out.writeStringField("status", "ok");
			out.writeEndObject();
			out.close();

			notifyCustomers(ent);
		}
		finally {
			if (txn.isActive()) {
				txn.rollback();
			}
		}
	}

	static void notifyCustomers(Entity resultEntity)
	{
		Key scenarioKey = (Key) resultEntity.getProperty("scenario");
		String scenarioId = scenarioKey.getName();

		String msgBody = "Scenario: "+scenarioId;
		msgBody += "\n";
		msgBody += "Rules: "+(String)resultEntity.getProperty("rules");
		msgBody += "\n";
		msgBody += "Location: "+(String)resultEntity.getProperty("location");
		msgBody += "\n";
		msgBody += "Players:\n";

		List<?> l = (List<?>) resultEntity.getProperty("playerNames");
		for (Object o : l) {
			msgBody += "*"+(String)o + "\n";
		}
		msgBody += "\n";

	log.info("body "+msgBody);
		try {

		Session mailSession = Session.getDefaultInstance(new Properties(), null);
		Message msg = new MimeMessage(mailSession);
		msg.setFrom(new InternetAddress("jasonalonzolong@gmail.com", "Jason Long"));
		msg.addRecipient(Message.RecipientType.TO,
			new InternetAddress("pandemic-duplicate-results@googlegroups.com", "Jason Long"));
		msg.setSubject("Pandemic - New Result Posted");
		msg.setText(msgBody);
		Transport.send(msg);

		}
		catch (Exception e) {
			log.warning("Mail exception: " + e);
		}
	}
}
