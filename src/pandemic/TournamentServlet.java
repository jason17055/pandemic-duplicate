package pandemic;

import java.io.*;
import java.security.Principal;
import java.util.logging.Logger;
import javax.servlet.http.*;
import com.fasterxml.jackson.core.*;
import com.google.appengine.api.datastore.*;

public class TournamentServlet extends HttpServlet
{
	private static final Logger log = Logger.getLogger(TournamentServlet.class.getName());

	@Override
	public void doGet(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		if (req.getParameter("id") != null) {
			doGetEntity(req.getParameter("id"), req, resp);
		}
		else {
			doGetIndex(req, resp);
		}
	}

	boolean isUser(HttpServletRequest req, Key userKey)
	{
		if (userKey == null) {
			return false;
		}

		Principal p = req.getUserPrincipal();
		if (p == null) {
			return false;
		}

		String username = p.getName();
		Key refKey = KeyFactory.createKey("User", username);
		return refKey.equals(userKey);
	}

	void doGetEntity(String id, HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Key key = KeyFactory.createKey("Tournament", id);
		Entity ent;
		try {
			ent = datastore.get(key);
		}
		catch (EntityNotFoundException e) {
			resp.sendError(HttpServletResponse.SC_NOT_FOUND);
			return;
		}

		resp.setContentType("text/json;charset=UTF-8");
		JsonGenerator out = new JsonFactory().
			createJsonGenerator(resp.getWriter()
			);

		out.writeStartObject();
		out.writeStringField("id", id);
		out.writeStringField("title", (String)ent.getProperty("title"));
		out.writeBooleanField("can_admin", isUser(req, (Key) ent.getProperty("owner")));
		out.writeEndObject();
		out.close();
	}

	void doGetIndex(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Query q = new Query("Tournament");
		PreparedQuery pq = datastore.prepare(q);

		resp.setContentType("text/json;charset=UTF-8");
		JsonGenerator out = new JsonFactory().
			createJsonGenerator(resp.getWriter()
			);

		out.writeStartArray();

		for (Entity ent : pq.asIterable()) {
			out.writeStartObject();
			String id = ent.getKey().getName();
			out.writeStringField("id", id);
			out.writeStringField("title", (String) ent.getProperty("title"));
			out.writeEndObject();
		}

		out.writeEndArray();
		out.close();
	}
}
