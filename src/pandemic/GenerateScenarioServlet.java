package pandemic;

import java.io.*;
import com.fasterxml.jackson.core.*;
import org.mozilla.javascript.*;
import javax.servlet.http.*;
import java.util.*;
import java.util.logging.Logger;
import com.google.appengine.api.datastore.*;
import static pandemic.PandemicDealServlet.MAX_PLAYERS;

public class GenerateScenarioServlet extends HttpServlet
{
	private static final Logger log = Logger.getLogger(GenerateScenarioServlet.class.getName());

	@Override
	public void doGet(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String rulesStr = req.getParameter("rules");
		if (rulesStr == null) {
			resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
			return;
		}

		Date d = new Date();
		String name = String.format("%1$tY-%1$tm-%1$td", d);

		String suffix = req.getParameter("suffix");
		if (suffix != null && suffix.length() <= 10) {
			name += suffix;
		}

		try {
			generateScenario(name, rulesStr);
			resp.setStatus(HttpServletResponse.SC_OK);
			resp.getWriter().println("Ok "+name);
		}
		catch (AlreadyExists e) {
			resp.setStatus(HttpServletResponse.SC_OK);
			resp.getWriter().println("Exists "+name);
		}
		catch (Exception e) {

			resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
			e.printStackTrace(resp.getWriter());
		}

	}

	void generateScenario(String name, String rules)
		throws IOException, AlreadyExists
	{
		String scenarioData;

		log.info("about to generate scenario "+name+" ("+rules+")");

		Context cx = Context.enter();
		try {

			Scriptable scope = cx.initStandardObjects();

		FileReader r1 = new FileReader("sha1.js");
		cx.evaluateReader(scope, r1, "sha1.js", 1, null);

		FileReader r2 = new FileReader("pandemic-game.js");
		cx.evaluateReader(scope, r2, "pandemic-game.js", 1, null);

		ScriptableObject.defineProperty(scope, "R_s", rules, 0);

		cx.evaluateString(scope, "G = generate_scenario_real(parse_rules(R_s));", "<cmd>", 1, null);
		String xtmp = cx.evaluateString(scope, "JSON.stringify(G)", "<cmd>", 1, null).toString();

		scenarioData = xtmp;

		}
		finally {
			Context.exit();
		}

		log.info(scenarioData);
		saveScenario(name, scenarioData);
	}

	void saveScenario(String name, String scenarioData)
		throws AlreadyExists
	{
		ScenarioInfo scenario;
		try {
			scenario = parseScenario(scenarioData);
		}
		catch (IOException e) {
			throw new RuntimeException("Unexpected I/O error: " + e, e);
		}

		log.info("scenario successfully parsed");

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Transaction txn = datastore.beginTransaction();

		try {

		Key key = KeyFactory.createKey("Scenario", name);
		log.info("key is "+key.toString());
		if (checkEntityExists(datastore, key)) {
			log.info("scenario "+name+" already exists");
			throw new AlreadyExists();
		}
		log.info("scenario does not already exist");

		Entity ent = new Entity(key);
		ent.setProperty("content", new Text(scenarioData));
		ent.setProperty("version", scenario.version);
		ent.setProperty("rules", scenario.rules.toString());
		ent.setProperty("playerCount", scenario.rules.playerCount);

		ArrayList<String> playerRoles = new ArrayList<String>();
		for (String s : scenario.roles) {
			if (s != null) {
				playerRoles.add(s);
			}
		}
		ent.setProperty("playerRoles", playerRoles);

		Date createdDate = new Date();
		ent.setProperty("created", createdDate);

		datastore.put(ent);
		log.info("saved scenario");

		txn.commit();

		}
		finally {
			if (txn.isActive()) {
				txn.rollback();
			}
		}
	}

	boolean checkEntityExists(DatastoreService datastore, Key key)
	{
		try {
			Entity ent = datastore.get(key);
			return true;
		}
		catch (EntityNotFoundException e) {
			return false;
		}
	}

	static class AlreadyExists extends Exception
	{
		AlreadyExists() { super("Scenario already exists."); }
	}

	static class ScenarioInfo
	{
		Rules rules;
		String version;
		String [] roles;
	}

	static class Rules
	{
		String expansion;
		int playerCount;
		int level;

		@Override
		public String toString() {
			return expansion + "-" + playerCount + "p-" + level + "x";
		}
	}

	static ScenarioInfo parseScenario(String scenarioData)
		throws IOException
	{
		JsonParser json = new JsonFactory().
			createJsonParser(new StringReader(scenarioData));
		ScenarioInfo scenario = new ScenarioInfo();

		while (json.nextToken() != null) {
			if (json.getCurrentToken() != JsonToken.FIELD_NAME) { continue; }

			String field = json.getCurrentName();
			if (field.equals("rules")) {
				scenario.rules = parseRules(json);
			}
			else if (field.equals("roles")) {
				scenario.roles = parseRoles(json);
			}
			else if (field.equals("version")) {
				json.nextToken();
				scenario.version = json.getText();
			}
		}
		return scenario;
	}

	static String [] parseRoles(JsonParser json)
		throws IOException
	{
		if (json.nextToken() != JsonToken.START_OBJECT) {
			throw new Error("Expected start of object");
		}

		String [] r = new String[MAX_PLAYERS];

		while (json.nextToken() != JsonToken.END_OBJECT) {
			assert json.getCurrentToken() == JsonToken.FIELD_NAME;
			String field = json.getCurrentName();

			int seat = Integer.parseInt(field);
			json.nextToken();
			if (seat >= 1 && seat <= MAX_PLAYERS) {
				r[seat-1] = json.getText();
			}
		}
		return r;
	}

	static Rules parseRules(JsonParser json)
		throws IOException
	{
		if (json.nextToken() != JsonToken.START_OBJECT) {
			throw new Error("Expected start of object");
		}

		Rules r = new Rules();

		while (json.nextToken() != JsonToken.END_OBJECT) {
			assert json.getCurrentToken() == JsonToken.FIELD_NAME;
			String field = json.getCurrentName();
			if (field.equals("player_count")) {
				json.nextToken();
				r.playerCount = json.getIntValue();
			}
			else if (field.equals("level")) {
				json.nextToken();
				r.level = json.getIntValue();
			}
			else if (field.equals("expansion")) {
				json.nextToken();
				r.expansion = json.getText();
			}
		}
		return r;
	}
}
