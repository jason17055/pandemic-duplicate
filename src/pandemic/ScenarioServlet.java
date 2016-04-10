package pandemic;

import java.io.*;
import java.util.ArrayList;
import java.util.Date;
import java.util.logging.Logger;
import javax.servlet.http.*;
import com.fasterxml.jackson.core.*;
import com.google.appengine.api.datastore.*;
import com.google.appengine.api.users.*;

import static pandemic.HelperFunctions.*;
import static pandemic.PandemicDealServlet.getRequestContent;
import static pandemic.PandemicDealServlet.MAX_PLAYERS;

public class ScenarioServlet extends HttpServlet
{
	private static final Logger log = Logger.getLogger(ScenarioServlet.class.getName());

	void doGetScenario(String scenarioName, HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		try {

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Key key = KeyFactory.createKey("Scenario", scenarioName);
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
		String scenario_id = req.getParameter("id");

		if (scenario_id != null) {
			doGetScenario(scenario_id, req, resp);
			return;
		}

		doGetIndex(req, resp);
	}

	void fetchUserProperties(DatastoreService ds, String userName, JsonGenerator out)
		throws IOException
	{
		Key key = KeyFactory.createKey("User", userName);
		try {
			Entity ent = ds.get(key);
			out.writeBooleanField("subscriber", true);
			Boolean b = (Boolean) ent.getProperty("can_create_tournaments");
			if (b != null && b.booleanValue()) {
				out.writeBooleanField("can_create_tournaments", true);
			}
		}
		catch (EntityNotFoundException e) {
			//ignore
		}
	}

	void doGetIndex(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Query q = new Query("Scenario");
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
			fetchUserProperties(datastore, req.getUserPrincipal().getName(), out);
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

		Query q_1 = new Query("Result");
		PreparedQuery pq_1 = datastore.prepare(q_1);

		out.writeFieldName("results");
		out.writeStartArray();

		for (Entity ent : pq_1.asIterable()) {
			out.writeStartObject();
			String scenario_id = ent.getKey().getParent().getName();
			String result_id = ent.getKey().getName();
			out.writeStringField("id", result_id);
			out.writeStringField("scenario", scenario_id);
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

	void doPostScenario(HttpServletRequest req, HttpServletResponse resp, String scenarioId)
		throws IOException
	{
		log.info("new scenario received for " + scenarioId);
		String content = getRequestContent(req);
		JsonParser json = new JsonFactory().
			createJsonParser(new StringReader(content));

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
			else if (ctx.equals("rules")) {
				r.parseCurrentToken(json);
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
			Key key = KeyFactory.createKey("Scenario", scenarioId);
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

	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String scenarioId = req.getParameter("id");
		if (scenarioId != null) {
			doPostScenario(req, resp, scenarioId);
			return;
		}

		resp.sendError(HttpServletResponse.SC_BAD_REQUEST);
	}
}
