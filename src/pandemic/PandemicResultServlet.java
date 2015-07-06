package pandemic;

import java.io.*;
import javax.servlet.http.*;
import com.fasterxml.jackson.core.*;
import com.google.appengine.api.datastore.*;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Properties;
import java.util.logging.Logger;

import static pandemic.PandemicDealServlet.getRequestContent;

public class PandemicResultServlet extends HttpServlet
{
	private static final Logger log = Logger.getLogger(PandemicResultServlet.class.getName());

	void doSearchResults(String qry, HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Query q = new Query("Result");
		Query.Filter f1 = new Query.FilterPredicate("playerNamesLC", Query.FilterOperator.EQUAL, qry.toLowerCase());
		Query.Filter f2 = new Query.FilterPredicate("locationLC", Query.FilterOperator.EQUAL, qry.toLowerCase());
		q = q.setFilter(
			Query.CompositeFilterOperator.or(f1, f2)
			);
		q = q.addSort("created", Query.SortDirection.DESCENDING);
		PreparedQuery pq = datastore.prepare(q);

		resp.setContentType("text/json;charset=UTF-8");
		JsonGenerator out = new JsonFactory().
			createJsonGenerator(resp.getWriter()
			);
		out.writeStartObject();
		out.writeFieldName("results");
		out.writeStartArray();

		for (Entity ent : pq.asIterable()) {
			out.writeStartObject();
			String result_id = ent.getKey().getName();
			String scenario_id = ent.getKey().getParent().getName();

			out.writeStringField("id", result_id);
			out.writeStringField("scenario", scenario_id);
			out.writeEndObject();
		}

		out.writeEndArray();
		out.writeEndObject();
		out.close();
	}

	void doGetResult(String deal_id, String result_id, HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		try {

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Key key = KeyFactory.createKey("Deal", deal_id);
		Key key1 = KeyFactory.createKey(key, "Result", result_id);
		Entity ent = datastore.get(key1);

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
		String tmp = req.getParameter("q");
		if (tmp != null) {
			doSearchResults(tmp, req, resp);
			return;
		}

		String scenarioId = req.getParameter("scenario");
		String resultId = req.getParameter("result");

		if (scenarioId != null && resultId != null) {
			doGetResult(scenarioId, resultId, req, resp);
			return;
		}

		resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
	}

	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
	}
}
