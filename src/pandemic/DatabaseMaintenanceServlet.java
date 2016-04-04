package pandemic;

import java.io.*;
import java.util.logging.Logger;
import javax.servlet.http.*;
import com.fasterxml.jackson.core.*;
import com.google.appengine.api.datastore.*;
import com.google.appengine.api.users.*;

public class DatabaseMaintenanceServlet extends HttpServlet
{
	private static final Logger log = Logger.getLogger(DatabaseMaintenanceServlet.class.getName());

	@Override
	public void doGet(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		DatastoreService ds = DatastoreServiceFactory.getDatastoreService();

		Query q = new Query("Scenario");
		PreparedQuery pq = ds.prepare(q);
		for (Entity ent : pq.asIterable()) {
			String xdeal = (String) ent.getProperty("deal");
			String xscenario = (String) ent.getProperty("scenario");

			// TODO
		}

	}
}
