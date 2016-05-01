package pandemic;

import java.io.*;
import java.security.Principal;
import java.util.Date;
import java.util.logging.Logger;
import javax.servlet.http.*;
import com.fasterxml.jackson.core.*;
import com.google.appengine.api.datastore.*;
import com.google.appengine.api.users.*;

public class AdminServlet extends HttpServlet
{
	private static final Logger log = Logger.getLogger(AdminServlet.class.getName());

	@Override
	public void doGet(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		if (!requireAdmin(req, resp)) {
			return;
		}

		Principal p = req.getUserPrincipal();
		String username = p != null ? p.getName() : "anonymous";

		resp.setContentType("text/html");
		PrintWriter out = resp.getWriter();
		out.println("Hello " + username);
		out.println("<form method=\"post\">");
		out.println("<label>");
		out.println("Username");
		out.println("<input type=\"text\" name=\"user\" value=\"" + username + "\">");
		out.println("</label>");
		out.println("<button type=\"submit\" name=\"action:promote_user\">Make TD</button>");
		out.println("</form>");
		out.println("<h2>Tournaments</h2>");
		out.println("<table border=\"1\">");

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Query q = new Query("Tournament");
		PreparedQuery pq = datastore.prepare(q);
		for (Entity ent : pq.asIterable()) {
			String url = "/#/manage_tournament/" + ent.getKey().getName();
			out.println("<tr>");
			out.println("<td><a href=\"" + url + "\">" + ent.getKey().getName() + "</a></td>");
			Key owner = (Key) ent.getProperty("owner");
			out.println("<td>" + owner.getName() + "</td>");
			out.println("</tr>");
		}
		out.println("</table>");
		out.println("<form method=\"post\">");
		out.println("<label>");
		out.println("Name");
		out.println("<input type=\"text\" name=\"name\" value=\"\">");
		out.println("</label>");
		out.println("<button type=\"submit\" name=\"action:create_tournament\">Create Tournament</button>");
		out.println("</form>");

		doShowScenarios(datastore, out);
		doShowResults(datastore, out);
	}

	void doShowScenarios(DatastoreService datastore, PrintWriter out)
	{
		out.println("<h2>Scenarios</h2>");
		out.println("<table border=\"1\">");
		Query q = new Query("Scenario");
		PreparedQuery pq = datastore.prepare(q);
		for (Entity ent : pq.asIterable()) {
			out.println("<tr>");
			out.println("<td>" + ent.getKey().toString() + "</td>");
			String tmpDaily = (String) ent.getProperty("dailyPandemic");
			out.println("<td>" + (tmpDaily != null ? tmpDaily : "") + "</td>");
			out.println("</tr>");
		}
		out.println("</table>");
		out.println("<form method=\"post\">");
		out.println("<button type=\"submit\" name=\"action:fix_scenario_schema\">Fix Schema</button>");
		out.println("</form>");
	}

	void doShowResults(DatastoreService datastore, PrintWriter out)
	{
		out.println("<h2>Results</h2>");
		out.println("<table border=\"1\">");
		Query q = new Query("Result");
		PreparedQuery pq = datastore.prepare(q);
		for (Entity ent : pq.asIterable()) {
			out.println("<tr>");
			out.println("<td>" + ent.getKey().toString() + "</td>");
			Key scenarioKey = (Key) ent.getProperty("scenario");
			out.println("<td>" + (scenarioKey != null ? scenarioKey.toString() : "") + "</td>");
			out.println("</tr>");
		}
		out.println("</table>");
		out.println("<form method=\"post\">");
		out.println("<button type=\"submit\" name=\"action:fix_results_schema\">Fix Schema</button>");
		out.println("</form>");
	}

	void doFixScenarioSchema(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		PrintWriter out = resp.getWriter();
		out.println("<table border=\"1\">");

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Query q = new Query("Scenario");
		PreparedQuery pq = datastore.prepare(q);
		int count = 0;
		for (Entity ent : pq.asIterable()) {
			String scenarioId = ent.getKey().getName();
			if (scenarioId.indexOf('-') == -1) {
				// not a daily-pandemic scenario
				continue;
			}
			if (ent.hasProperty("dailyPandemic")) {
				// already fixed
				continue;
			}

			count++;
			out.println("<tr>");
			out.println("<td>" + ent.getKey().toString() + "</td>");
			if (count <= 10) {
				ent.setProperty("dailyPandemic", scenarioId);
				datastore.put(ent);

				out.println("<td>set dailyPandemic to " + scenarioId + "</td>");
			}
			out.println("</tr>");
		}
		out.println("</table>");
	}

	void doFixResultsSchema(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		PrintWriter out = resp.getWriter();
		out.println("<table border=\"1\">");

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Query q = new Query("Result");
		PreparedQuery pq = datastore.prepare(q);
		int count = 0;
		for (Entity ent : pq.asIterable()) {
			Key parentKey = ent.getKey().getParent();
			if (parentKey == null) {
				continue;
			}
			count++;
			out.println("<tr>");
			out.println("<td>" + ent.getKey().toString() + "</td>");
			if (count <= 10) {
				if (parentKey != null && parentKey.getKind().equals("Deal")) {
					Key newKey = KeyFactory.createKey("Result", ent.getKey().getName());
					Entity newEnt = new Entity(newKey);
					newEnt.setPropertiesFrom(ent);
					datastore.put(newEnt);
					datastore.delete(ent.getKey());

					out.println("<td>replaced with " + newKey.toString() + "</td>");
				}
				else {
					out.println("<td>Unrecognized parent key</td>");
				}
			}
			out.println("</tr>");
		}
		out.println("</table>");
	}

	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		if (!requireAdmin(req, resp)) {
			return;
		}

		if (req.getParameter("action:create_tournament") != null) {
			doCreateTournament(req, resp);
			return;
		}
		else if (req.getParameter("action:promote_user") != null) {
			doPromoteUser(req, resp);
			return;
		}
		else if (req.getParameter("action:fix_scenario_schema") != null) {
			doFixScenarioSchema(req, resp);
			return;
		}
		else if (req.getParameter("action:fix_results_schema") != null) {
			doFixResultsSchema(req, resp);
			return;
		}
		else {
			resp.sendError(HttpServletResponse.SC_BAD_REQUEST);
		}
	}

	Key getRequesterAsKey(HttpServletRequest req)
	{
		Principal p = req.getUserPrincipal();
		String username = p != null ? p.getName() : "anonymous";
		return KeyFactory.createKey("User", username);
	}

	void doCreateTournament(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String name = req.getParameter("name");
		Key user = getRequesterAsKey(req);

		DatastoreService ds = DatastoreServiceFactory.getDatastoreService();
		Key key = KeyFactory.createKey("Tournament", name);
		Transaction txn = ds.beginTransaction();
		try {
			Entity ent;
			try {
				ent = ds.get(key);
				// If getting here, then the entry already exists
				resp.sendError(HttpServletResponse.SC_CONFLICT);
				return;
			}
			catch (EntityNotFoundException e) {
				ent = new Entity(key);
			}

			ent.setProperty("created", new Date());
			ent.setProperty("createdBy", user);
			ent.setProperty("owner", user);
			ent.setProperty("title", name);
			ent.setProperty("titleLC", name.toLowerCase());
			ds.put(ent);

			txn.commit();
		}
		finally {
			if (txn.isActive()) {
				txn.rollback();
			}
		}

		resp.setStatus(HttpServletResponse.SC_NO_CONTENT);
	}

	void doPromoteUser(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String u = req.getParameter("user");
		PrintWriter out = resp.getWriter();
		out.println("Want to make " + u + " a TD.");

		DatastoreService ds = DatastoreServiceFactory.getDatastoreService();
		Key key = KeyFactory.createKey("User", u);
		Transaction txn = ds.beginTransaction();
		try {
			Entity ent;
			try {
				ent = ds.get(key);
			} catch (EntityNotFoundException e) {
				ent = new Entity(key);
			}

			ent.setProperty("can_create_tournaments", Boolean.TRUE);
			ds.put(ent);

			txn.commit();
		}
		finally {
			if (txn.isActive()) {
				txn.rollback();
			}
		}

		out.println("success");
	}

	boolean requireAdmin(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		UserService userService = UserServiceFactory.getUserService();
                if (!userService.isUserAdmin()) {
			resp.sendError(HttpServletResponse.SC_UNAUTHORIZED);
			return false;
		}
		return true;
	}
}
