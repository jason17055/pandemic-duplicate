package pandemic;

import java.io.*;
import javax.servlet.http.*;
import com.fasterxml.jackson.core.*;
import com.google.appengine.api.datastore.*;
import java.util.Date;
import java.util.logging.Logger;

public class PandemicDealServlet extends HttpServlet
{
	private static final Logger log = Logger.getLogger(PandemicDealServlet.class.getName());

	void doGetDeal(String deal_id, HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		try {

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Key key = KeyFactory.createKey("Deal", deal_id);
		Entity ent = datastore.get(key);

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

	void doGetResult(String deal_id, String result_id, HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		try {

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Key key = KeyFactory.createKey("Deal", deal_id);
		Key key1 = KeyFactory.createKey(key, "Result", result_id);
		Entity ent = datastore.get(key);

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
		String deal_id = req.getParameter("deal");
		String result_id = req.getParameter("result");

		if (deal_id != null && result_id != null) {
			doGetResult(deal_id, result_id, req, resp);
			return;
		}

		if (deal_id != null) {
			doGetDeal(deal_id, req, resp);
			return;
		}

		doGetIndex(req, resp);
	}

	void doGetIndex(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Query q = new Query("Deal");
		PreparedQuery pq = datastore.prepare(q);

		resp.setContentType("text/json;charset=UTF-8");
		JsonGenerator out = new JsonFactory().
			createJsonGenerator(resp.getWriter()
			);
		out.writeStartObject();
		out.writeStringField("serverVersion", "1");
		out.writeFieldName("deals");
		out.writeStartArray();

		for (Entity ent : pq.asIterable()) {
			out.writeStartObject();
			String id = ent.getKey().getName();
			out.writeStringField("id", id);
			String rules = (String) ent.getProperty("rules");
			out.writeStringField("rules", rules);
			out.writeEndObject();
		}

		out.writeEndArray();

		Query q_1 = new Query("Result");
		PreparedQuery pq_1 = datastore.prepare(q_1);

		out.writeFieldName("results");
		out.writeStartArray();

		for (Entity ent : pq_1.asIterable()) {
			out.writeStartObject();
			String deal_id = ent.getKey().getParent().getName();
			String result_id = ent.getKey().getName();
			out.writeStringField("id", result_id);
			out.writeStringField("deal", deal_id);
			out.writeEndObject();
		}

		out.writeEndArray();

		out.writeEndObject();
		out.close();
	}

	static String getRequestContent(HttpServletRequest req)
		throws IOException
	{
		StringBuilder sb = new StringBuilder();
		Reader r = req.getReader();
		char [] cbuf = new char[1024];
		int nread;

		while ( (nread = r.read(cbuf)) != -1 )
		{
			sb.append(cbuf, 0, nread);
		}

		return sb.toString();
	}

	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String deal_id = req.getParameter("id");
		if (deal_id != null) {
			doPostDeal(req, resp, deal_id);
			return;
		}

		String result_id = req.getParameter("result");
		if (result_id != null) {
			doPostResult(req, resp, result_id);
			return;
		}

		resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
		return;
	}

	void doPostDeal(HttpServletRequest req, HttpServletResponse resp, String deal_id)
		throws IOException
	{
		String content = getRequestContent(req);
		JsonParser json = new JsonFactory().
			createJsonParser(new StringReader(content));

		class Rules {
			String expansion;
			int playerCount;
			int level;

			@Override
			public String toString()
			{
				return expansion + "-" + playerCount + "p-" + level + "x";
			}
		}
		Rules r = new Rules();
		String versionString = null;
		String ctx = "";
		String [] roles = new String[4];
		while (json.nextToken() != null) {
			if (json.getCurrentToken() == JsonToken.END_OBJECT) { ctx = ""; }
			if (json.getCurrentToken() != JsonToken.FIELD_NAME) { continue; }

			if (json.getCurrentName().equals("rules")) {
				ctx = "rules";
				json.nextToken();
			}
			else if (json.getCurrentName().equals("roles")) {
				ctx = "roles";
				json.nextToken();
			}
			else if (json.getCurrentName().equals("version")) {
				json.nextToken();
				versionString = json.getText();
			}
			else if (ctx.equals("rules") && json.getCurrentName().equals("player_count")) {
				json.nextToken();
				r.playerCount = json.getIntValue();
			}
			else if (ctx.equals("rules") && json.getCurrentName().equals("level")) {
				json.nextToken();
				r.level = json.getIntValue();
			}
			else if (ctx.equals("rules") && json.getCurrentName().equals("expansion")) {
				json.nextToken();
				r.expansion = json.getText();
			}
			else if (ctx.equals("roles")) {
				int seat = Integer.parseInt(json.getCurrentName());
				json.nextToken();
				if (seat >= 1 && seat <= 4) {
					roles[seat-1] = json.getText();
				}
			}
		}

		String playerRoles = "";
		for (int i = 0; i < r.playerCount; i++) {
			if (i != 0) { playerRoles += "/"; }
			playerRoles += roles[i];
		}

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Transaction txn = datastore.beginTransaction();

		try
		{
			Key key = KeyFactory.createKey("Deal", deal_id);
			Date createdDate = new Date();
			String creatorIp = req.getRemoteAddr();

			Entity ent = new Entity(key);
			ent.setProperty("content", new Text(content));
			ent.setProperty("version", versionString);
			ent.setProperty("rules", r.toString());
			ent.setProperty("playerRoles", playerRoles);

			ent.setProperty("created", createdDate);
			ent.setProperty("createdBy", creatorIp);

			datastore.put(ent);
			txn.commit();

			resp.setContentType("text/json;charset=UTF-8");
			JsonGenerator out = new JsonFactory().
				createJsonGenerator(resp.getWriter());
			out.writeStartObject();
			out.writeStringField("status", "ok");
			out.writeEndObject();
			out.close();
		}
		finally {
			if (txn.isActive()) {
				txn.rollback();
			}
		}
	}

	void doPostResult(HttpServletRequest req, HttpServletResponse resp, String result_id)
		throws IOException
	{
		String content = getRequestContent(req);
		JsonParser json = new JsonFactory().
			createJsonParser(new StringReader(content));

		String versionString = null;
		String rulesString = null;
		String shuffleId = null;
		int score = 0;
		String [] playerNames = new String[4];

		while (json.nextToken() != null) {
			if (json.getCurrentToken() != JsonToken.FIELD_NAME) { continue; }

			if (json.getCurrentName().equals("rules")) {
				json.nextToken();
				rulesString = json.getText();
			}
			else if (json.getCurrentName().equals("shuffle_id")) {
				json.nextToken();
				shuffleId = json.getText();
			}
			else if (json.getCurrentName().equals("version")) {
				json.nextToken();
				versionString = json.getText();
			}
			else if (json.getCurrentName().equals("score")) {
				json.nextToken();
				score = json.getCurrentToken() == JsonToken.VALUE_NUMBER_INT ?
						json.getIntValue() :
						Integer.parseInt(json.getText());
			}
		}

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Transaction txn = datastore.beginTransaction();

		try
		{
			Key key = KeyFactory.createKey("Deal", shuffleId);
			Key key1 = KeyFactory.createKey(key, "Result", result_id);
			Date createdDate = new Date();
			String creatorIp = req.getRemoteAddr();

			Entity ent = new Entity(key1);
			ent.setProperty("content", new Text(content));
			ent.setProperty("version", versionString);
			ent.setProperty("rules", rulesString);
			ent.setProperty("score", new Integer(score));

			ent.setProperty("created", createdDate);
			ent.setProperty("createdBy", creatorIp);

			datastore.put(ent);
			txn.commit();

			resp.setContentType("text/json;charset=UTF-8");
			JsonGenerator out = new JsonFactory().
				createJsonGenerator(resp.getWriter());
			out.writeStartObject();
			out.writeStringField("status", "ok");
			out.writeEndObject();
			out.close();
		}
		finally {
			if (txn.isActive()) {
				txn.rollback();
			}
		}
	}
}
