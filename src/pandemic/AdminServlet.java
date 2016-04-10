package pandemic;

import java.io.*;
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

		PrintWriter out = resp.getWriter();
		out.println("Hello world.");
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
