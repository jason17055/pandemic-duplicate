package pandemic;

import java.io.*;
import com.fasterxml.jackson.core.*;
import org.mozilla.javascript.*;
import javax.servlet.http.*;
import java.util.*;
import java.util.logging.Logger;
import com.google.appengine.api.datastore.*;
import static pandemic.PandemicDealServlet.MAX_PLAYERS;
import static pandemic.HelperFunctions.*;

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

		if (rulesStr.equals("@1")) {
			rulesStr = pickRulesFrom("rules-rotations/1");
		}

		Date d = new Date();
		String name = String.format("%1$tY-%1$tm-%1$td", d);

		String suffix = req.getParameter("suffix");
		if (suffix != null && suffix.length() <= 10) {
			name += "." + suffix;
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

	String pickRulesFrom(String path)
		throws IOException
	{
		BufferedReader in = new BufferedReader(
			new FileReader(path));
		ArrayList<String> values = new ArrayList<String>();
		String s;
		while ( (s=in.readLine()) != null ) {
			values.add(s);
		}
		in.close();

		Date d = new Date();
		int index = (int)((d.getTime() / 86400000) % values.size());

		return values.get(index);
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
		ent.setProperty("dailyPandemic", name);

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

	static class ScenarioInfo
	{
		Rules rules;
		String version;
		String [] roles;
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
}
