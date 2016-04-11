package pandemic;

import java.io.*;
import java.security.Principal;
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
		out.println("<button type=\"submit\">Make TD</button>");
		out.println("</form>");
	}

	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		if (!requireAdmin(req, resp)) {
			return;
		}

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
