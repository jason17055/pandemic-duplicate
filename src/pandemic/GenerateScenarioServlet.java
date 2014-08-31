package pandemic;

import java.io.*;
import org.mozilla.javascript.*;
import javax.servlet.http.*;
import java.util.logging.Logger;
import com.google.appengine.api.datastore.*;

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

		try {
			generateScenario(rulesStr);
			resp.setStatus(HttpServletResponse.SC_OK);
			resp.getWriter().println("Ok");
		}
		catch (Exception e) {

			resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
			e.printStackTrace(resp.getWriter());
		}

	}

	void generateScenario(String rules) throws Exception
	{
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

		log.info(xtmp);

		}
		finally {
			Context.exit();
		}
	}
}
