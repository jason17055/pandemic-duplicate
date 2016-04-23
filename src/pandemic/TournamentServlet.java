package pandemic;

import java.io.*;
import java.security.Principal;
import java.util.List;
import java.util.logging.Logger;
import javax.servlet.http.*;
import com.fasterxml.jackson.core.*;
import com.google.appengine.api.datastore.*;

import static com.google.appengine.api.datastore.Query.FilterOperator.EQUAL;

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

		boolean adminAccess = false;
		if (req.getParameter("admin") != null) {
			Principal p = req.getUserPrincipal();
			if (p == null) {
				log.warning("user is not logged in");
				resp.sendError(HttpServletResponse.SC_UNAUTHORIZED);
				return;
			}
			Key ownerKey = (Key) ent.getProperty("owner");
			if (!p.getName().equals(ownerKey.getName())) {
				log.warning(p.getName() + " is not the owner for this tournament");
				resp.sendError(HttpServletResponse.SC_UNAUTHORIZED);
				return;
			}
			adminAccess = true;
		}

		boolean tournamentVisible = false;
		if (ent.hasProperty("visible")) {
			tournamentVisible = ((Boolean) ent.getProperty("visible")).booleanValue();
		}
		if (!tournamentVisible && !adminAccess) {
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
		out.writeBooleanField("can_admin", adminAccess);

		if (adminAccess) {
			out.writeBooleanField("visible", tournamentVisible);
		}

		// list open events for this tournament
		{
			out.writeFieldName("open_events");
			out.writeStartArray();

			Query q = new Query("TournamentEvent");
			q.setAncestor(key);
			PreparedQuery pq = datastore.prepare(q);
			for (Entity eventEnt : pq.asIterable()) {
				out.writeStartObject();
				long eventId = eventEnt.getKey().getId();
				out.writeStringField("id", Long.toString(eventId));
				out.writeStringField("name", (String) eventEnt.getProperty("name"));
				out.writeStringField("scenario", ((Key) eventEnt.getProperty("scenario")).getName());
				out.writeEndObject();
			}
			out.writeEndArray();
		}

		if (adminAccess) {
			// list events for this tournament
			out.writeFieldName("all_events");
			out.writeStartArray();

			Query q = new Query("TournamentEvent");
			q.setAncestor(key);
			PreparedQuery pq = datastore.prepare(q);
			for (Entity eventEnt : pq.asIterable()) {
				out.writeStartObject();
				long eventId = eventEnt.getKey().getId();
				out.writeStringField("id", Long.toString(eventId));
				out.writeStringField("name", (String) eventEnt.getProperty("name"));
				out.writeStringField("scenario", ((Key) eventEnt.getProperty("scenario")).getName());
				out.writeEndObject();
			}
			out.writeEndArray();
		}
		if (adminAccess) {
			// list current games for this tournament
			out.writeFieldName("games");
			out.writeStartArray();

			Query q = new Query("Play");
			q.setFilter(EQUAL.of("tournament", key));
			q.addSort("created", Query.SortDirection.DESCENDING);
			PreparedQuery pq = datastore.prepare(q);
			for (Entity playEnt : pq.asIterable()) {
				Key evtKey = (Key) playEnt.getProperty("tournamentEvent");
				long eventId = evtKey != null ? evtKey.getId() : 0;

				out.writeStartObject();
				out.writeStringField("event", Long.toString(eventId));
				out.writeStringField("id", playEnt.getKey().getName());
				out.writeStringField("scenario", (String) playEnt.getProperty("scenario"));

				List<?> l = (List<?>) playEnt.getProperty("playerNames");
				out.writeFieldName("players");
				out.writeStartArray();
				for (Object o : l) {
					out.writeString((String) o);
				}
				out.writeEndArray();

				if (ent.hasProperty("location")) {
					String location = playEnt.getProperty("location").toString();
					out.writeStringField("location", location);
				}

				out.writeEndObject();
			}
			out.writeEndArray();
		}

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

	@Override
	public void doPost(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		String pathInfo = req.getPathInfo();
		if ("/add_scenario".equals(pathInfo)) {
			doAddScenario(req, resp);
		}
		else {
			resp.sendError(HttpServletResponse.SC_BAD_REQUEST);
		}
	}

	void doAddScenario(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		Principal p = req.getUserPrincipal();
		if (p == null) {
			log.warning("user is not logged in");
			resp.sendError(HttpServletResponse.SC_UNAUTHORIZED);
			return;
		}

		String scenarioId = null, tournamentId = null, name = null;
		JsonParser json = new JsonFactory().createJsonParser(req.getReader());
		while (json.nextToken() != null) {
			if (json.getCurrentToken() != JsonToken.FIELD_NAME) { continue; }

			if (json.getCurrentName().equals("scenario")) {
				json.nextToken();
				scenarioId = json.getText();
			}
			else if (json.getCurrentName().equals("tournament")) {
				json.nextToken();
				tournamentId = json.getText();
			}
			else if (json.getCurrentName().equals("name")) {
				json.nextToken();
				name = json.getText();
			}
		}

		log.info("got scenario " + scenarioId);
		log.info("got tournament " + tournamentId);
		log.info("got name " + name);

		if (scenarioId == null || tournamentId == null || name == null) {
			resp.sendError(HttpServletResponse.SC_BAD_REQUEST);
			return;
		}

		DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
		Key tournamentKey = KeyFactory.createKey("Tournament", tournamentId);

		Transaction txn = datastore.beginTransaction();
		try {
			Entity tournamentEnt;
			try {
				tournamentEnt = datastore.get(tournamentKey);
			}
			catch (EntityNotFoundException e) {
				log.warning("tournament " + tournamentId + " not found");
				resp.sendError(HttpServletResponse.SC_NOT_FOUND);
				return;
			}

			Key ownerKey = (Key) tournamentEnt.getProperty("owner");
			if (!p.getName().equals(ownerKey.getName())) {
				log.warning(p.getName() + " is not the owner for this tournament");
				resp.sendError(HttpServletResponse.SC_UNAUTHORIZED);
				return;
			}

			long nextEventId;
			if (tournamentEnt.hasProperty("nextEventId")) {
				nextEventId = ((Long) tournamentEnt.getProperty("nextEventId")).longValue();
			} else {
				nextEventId = 1L;
			}

			tournamentEnt.setProperty("nextEventId", new Long(nextEventId+1));
			datastore.put(tournamentEnt);

			Key scenarioKey = KeyFactory.createKey("Scenario", scenarioId);
			Key eventKey = KeyFactory.createKey(tournamentKey, "TournamentEvent", nextEventId);
			Entity eventEnt = new Entity(eventKey);
			eventEnt.setProperty("scenario", scenarioKey);
			eventEnt.setProperty("name", name);
			datastore.put(eventEnt);

			txn.commit();

			JsonGenerator out = new JsonFactory().
				createJsonGenerator(resp.getWriter());
			out.writeStartObject();
			out.writeStringField("status", "ok");
			out.writeStringField("event_id", Long.toString(nextEventId));
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
