package pandemic;

import java.io.*;
import javax.servlet.http.*;
import com.fasterxml.jackson.core.*;
import com.google.appengine.api.datastore.*;
import com.google.appengine.api.users.*;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Properties;
import java.util.logging.Logger;
import javax.mail.*;
import javax.mail.internet.*;

public class PandemicDealServlet extends HttpServlet
{
	private static final Logger log = Logger.getLogger(PandemicDealServlet.class.getName());
	static final int MAX_PLAYERS = 5;

	void doGetDeal(String deal_id, HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		try {

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Key key = KeyFactory.createKey("Deal", deal_id);
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

	void doGetResult(String deal_id, String result_id, HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		try {

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Key key = KeyFactory.createKey("Deal", deal_id);
		Key key1 = KeyFactory.createKey(key, "Result", result_id);
		Entity ent = datastore.get(key1);

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
		String deal_id = req.getParameter("deal");
		String result_id = req.getParameter("result");

		if (deal_id != null && result_id != null) {
			doGetResult(deal_id, result_id, req, resp);
			return;
		}

		if (deal_id != null) {
			doGetDeal(deal_id, req, resp);
			return;
		}

		doGetIndex(req, resp);
	}

	void doGetIndex(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Query q = new Query("Deal");
		PreparedQuery pq = datastore.prepare(q);

		resp.setContentType("text/json;charset=UTF-8");
		JsonGenerator out = new JsonFactory().
			createJsonGenerator(resp.getWriter()
			);
		out.writeStartObject();
		out.writeStringField("serverVersion", "1");

		UserService userService = UserServiceFactory.getUserService();
		if (req.getUserPrincipal() == null) {
			// not signed in

			String loginUrl = userService.createLoginURL(
				getBaseUrl(req));
			out.writeStringField("loginUrl", loginUrl);
		}
		else {
			out.writeStringField("userName",
				req.getUserPrincipal().getName());
			String logoutUrl = userService.createLogoutURL(
				getBaseUrl(req));
			out.writeStringField("logoutUrl", logoutUrl);
		}

		out.writeFieldName("scenarios");
		out.writeStartArray();

		for (Entity ent : pq.asIterable()) {
			out.writeStartObject();
			String id = ent.getKey().getName();
			out.writeStringField("id", id);
			String rules = (String) ent.getProperty("rules");
			out.writeStringField("rules", rules);
			out.writeEndObject();
		}

		out.writeEndArray();

	// BEGIN - backward compatibility
		out.writeFieldName("deals");
		out.writeStartArray();

		pq = datastore.prepare(q);
		for (Entity ent : pq.asIterable()) {
			out.writeStartObject();
			String id = ent.getKey().getName();
			out.writeStringField("id", id);
			String rules = (String) ent.getProperty("rules");
			out.writeStringField("rules", rules);
			out.writeEndObject();
		}

		out.writeEndArray();
	// END - backward compatibility

		Query q_1 = new Query("Result");
		PreparedQuery pq_1 = datastore.prepare(q_1);

		out.writeFieldName("results");
		out.writeStartArray();

		for (Entity ent : pq_1.asIterable()) {
			out.writeStartObject();
			String deal_id = ent.getKey().getParent().getName();
			String result_id = ent.getKey().getName();
			out.writeStringField("id", result_id);
			out.writeStringField("scenario", deal_id);
	// BEGIN - backward compatibility
			out.writeStringField("deal", deal_id);
	// END - backward compatibility
			out.writeEndObject();
		}

		out.writeEndArray();

		out.writeEndObject();
		out.close();
	}

	static String getBaseUrl(HttpServletRequest req)
	{
		String scheme = req.getScheme();
		int port = req.getServerPort();
		int defaultPort = scheme.equals("https") ? 443 : 80;

		String myUrl = scheme + "://" + req.getServerName() + (port == defaultPort ? "" : ":"+port) + req.getContextPath();
		return myUrl;
	}

	static String getRequestContent(HttpServletRequest req)
		throws IOException
	{
		StringBuilder sb = new StringBuilder();
		Reader r = req.getReader();
		char [] cbuf = new char[1024];
		int nread;

		while ( (nread = r.read(cbuf)) != -1 )
		{
			sb.append(cbuf, 0, nread);
		}

		return sb.toString();
	}

	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String deal_id = req.getParameter("id");
		if (deal_id != null) {
			doPostDeal(req, resp, deal_id);
			return;
		}

		String result_id = req.getParameter("result");
		if (result_id != null) {
			doPostResult(req, resp, result_id);
			return;
		}

		resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
		return;
	}

	void doPostDeal(HttpServletRequest req, HttpServletResponse resp, String deal_id)
		throws IOException
	{
		log.info("new scenario received for " + deal_id);
		String content = getRequestContent(req);
		JsonParser json = new JsonFactory().
			createJsonParser(new StringReader(content));

		class Rules {
			String expansion;
			int playerCount;
			int level;
			boolean virulentStrain;
			boolean mutationChallenge;
			boolean worldwidePanic;
			boolean labChallenge;

			@Override
			public String toString()
			{
				return expansion + "-" + playerCount + "p-" + level + "x" +
					(virulentStrain ? "-vs" : "") +
					(mutationChallenge ? "-mut" : "") +
					(worldwidePanic ? "-wp" : "") +
					(labChallenge ? "-lab" : "");
			}
		}
		Rules r = new Rules();
		String versionString = null;
		String ctx = "";
		String [] roles = new String[MAX_PLAYERS];
		while (json.nextToken() != null) {
			if (json.getCurrentToken() == JsonToken.END_OBJECT) { ctx = ""; }
			if (json.getCurrentToken() != JsonToken.FIELD_NAME) { continue; }

			if (json.getCurrentName().equals("rules")) {
				ctx = "rules";
				json.nextToken();
			}
			else if (json.getCurrentName().equals("roles")) {
				ctx = "roles";
				json.nextToken();
			}
			else if (json.getCurrentName().equals("version")) {
				json.nextToken();
				versionString = json.getText();
			}
			else if (ctx.equals("rules") && json.getCurrentName().equals("player_count")) {
				json.nextToken();
				r.playerCount = json.getIntValue();
			}
			else if (ctx.equals("rules") && json.getCurrentName().equals("level")) {
				json.nextToken();
				r.level = json.getIntValue();
			}
			else if (ctx.equals("rules") && json.getCurrentName().equals("expansion")) {
				json.nextToken();
				r.expansion = json.getText();
			}
			else if (ctx.equals("rules") && json.getCurrentName().equals("virulent_strain")) {
				json.nextToken();
				r.virulentStrain = json.getText().equals("true");
			}
			else if (ctx.equals("rules") && json.getCurrentName().equals("mutation_challenge")) {
				json.nextToken();
				r.mutationChallenge = json.getText().equals("true");
			}
			else if (ctx.equals("rules") && json.getCurrentName().equals("worldwide_panic")) {
				json.nextToken();
				r.worldwidePanic = json.getText().equals("true");
			}
			else if (ctx.equals("rules") && json.getCurrentName().equals("lab_challenge")) {
				json.nextToken();
				r.labChallenge = json.getText().equals("true");
			}
			else if (ctx.equals("roles")) {
				int seat = Integer.parseInt(json.getCurrentName());
				json.nextToken();
				if (seat >= 1 && seat <= MAX_PLAYERS) {
					roles[seat-1] = json.getText();
				}
			}
		}

		ArrayList<String> playerRoles = new ArrayList<String>();
		for (String s : roles) {
			if (s != null) {
				playerRoles.add(s);
			}
		}

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Transaction txn = datastore.beginTransaction();

		try
		{
			Key key = KeyFactory.createKey("Scenario", deal_id);
			log.info("key is " + key.toString());
			Date createdDate = new Date();
			String creatorIp = req.getRemoteAddr();

			Entity ent = new Entity(key);
			ent.setProperty("content", new Text(content));
			ent.setProperty("version", versionString);
			ent.setProperty("rules", r.toString());
			ent.setProperty("playerCount", r.playerCount);

		// WARNING: older version of playerRoles is /-separated string
			ent.setProperty("playerRoles", playerRoles);

			ent.setProperty("created", createdDate);
			ent.setProperty("createdBy", creatorIp);

			datastore.put(ent);
			log.info("saved scenario");

			txn.commit();

			resp.setContentType("text/json;charset=UTF-8");
			JsonGenerator out = new JsonFactory().
				createJsonGenerator(resp.getWriter());
			out.writeStartObject();
			out.writeStringField("status", "ok");
			out.writeEndObject();
			out.close();
		}
		finally {
			if (txn.isActive()) {
				txn.rollback();
			}
		}
	}

	void doPostResult(HttpServletRequest req, HttpServletResponse resp, String result_id)
		throws IOException
	{
		String content = getRequestContent(req);
		JsonParser json = new JsonFactory().
			createJsonParser(new StringReader(content));

		String versionString = null;
		String rulesString = null;
		String shuffleId = null;
		int score = 0;
		String [] playerNames = new String[MAX_PLAYERS];
		String location = null;

		while (json.nextToken() != null) {
			if (json.getCurrentToken() != JsonToken.FIELD_NAME) { continue; }

			String k = json.getCurrentName();
			if (k.equals("rules")) {
				json.nextToken();
				rulesString = json.getText();
			}
			else if (k.equals("shuffle_id")) {
				json.nextToken();
				shuffleId = json.getText();
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
			else {
				// unrecognized
				json.nextToken();
				json.skipChildren();
			}
		}

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Transaction txn = datastore.beginTransaction();

		try
		{
			Key key = KeyFactory.createKey("Deal", shuffleId);
			Key key1 = KeyFactory.createKey(key, "Result", result_id);
			Date createdDate = new Date();
			String creatorIp = req.getRemoteAddr();

			Entity ent = new Entity(key1);
			ent.setProperty("content", new Text(content));
			ent.setProperty("version", versionString);
			ent.setProperty("rules", rulesString);
			ent.setProperty("score", new Integer(score));

			if (location != null && location.length() != 0) {
				ent.setProperty("location", location);
				ent.setProperty("locationLC", location.toLowerCase());
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

	void notifyCustomers(Entity resultEntity)
	{
		String msgBody = "Rules: "+(String)resultEntity.getProperty("rules");
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
			new InternetAddress("jasonalonzolong@gmail.com", "Jason Long"));
		msg.setSubject("Pandemic - New Result Posted");
		msg.setText(msgBody);
		Transport.send(msg);

		}
		catch (Exception e) {
			log.warning("Mail exception: " + e);
		}
	}
}
