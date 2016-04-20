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

public class TournamentServlet extends HttpServlet
{
	private static final Logger log = Logger.getLogger(TournamentServlet.class.getName());

	@Override
	public void doGet(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		doGetIndex(req, resp);
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
