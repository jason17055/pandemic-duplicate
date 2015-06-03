package pandemic;

import java.io.*;
import java.util.Arrays;
import java.util.HashMap;
import javax.servlet.http.*;
import com.fasterxml.jackson.core.*;
import com.google.appengine.api.datastore.*;

public class HelperFunctions
{
	public static boolean checkEntityExists(DatastoreService datastore, Key key)
	{
		try {
			Entity ent = datastore.get(key);
			return true;
		}
		catch (EntityNotFoundException e) {
			return false;
		}
	}

	public static class AlreadyExists extends Exception
	{
		public AlreadyExists() { super("Scenario already exists."); }
	}

	static void writeErrorResponse(HttpServletResponse resp, int status, String message)
		throws IOException
	{
		resp.setStatus(status);

		JsonGenerator out = new JsonFactory().
			createJsonGenerator(resp.getWriter());
		out.writeStartObject();
		out.writeStringField("status", "error");
		out.writeStringField("error", message);
		out.writeEndObject();
		out.close();
	}

	public static class Rules
	{
		static final String[] MODULE_LIST = new String[] {
			"virulent_strain",
			"mutation_challenge",
			"worldwide_panic",
			"lab_challenge",
			"quarantines",
			"hinterlands_challenge",
			"emergency_event_challenge",
			"superbug_challenge",
		};
		String expansion;
		int playerCount;
		int level;
		HashMap<String, Boolean> modules;

		public Rules()
		{
			modules = new HashMap<String, Boolean>();
		}

		@Override
		public String toString()
		{
			String ret = playerCount + "p-" + level + "x-" + expansion;
			for (String module : MODULE_LIST) {
				if (modules.containsKey(module) && modules.get(module)) {
					ret += "-" + module;
				}
			}
			return ret;
		}
		
		public boolean parseCurrentToken(JsonParser json)
			throws IOException
		{
			String cur = json.getCurrentName();
			if (cur.equals("player_count")) {
				json.nextToken();
				playerCount = json.getIntValue();
				return true;
			}
			else if (cur.equals("level")) {
				json.nextToken();
				level = json.getIntValue();
				return true;
			}
			else if (cur.equals("expansion")) {
				json.nextToken();
				expansion = json.getText();
				return true;
			}
			else if (Arrays.asList(MODULE_LIST).contains(cur)) {
				json.nextToken();
				modules.put(cur, json.getText().equals("true"));
				return true;
			}
			else {
				return false;
			}
		}
	}

	public static Rules parseRules(JsonParser json)
		throws IOException
	{
		if (json.nextToken() != JsonToken.START_OBJECT) {
			throw new Error("Expected start of object");
		}

		Rules r = new Rules();

		while (json.nextToken() != JsonToken.END_OBJECT) {
			assert json.getCurrentToken() == JsonToken.FIELD_NAME;
			r.parseCurrentToken(json);
		}
		return r;
	}
}
