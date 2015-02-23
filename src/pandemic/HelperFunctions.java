package pandemic;

import java.io.*;
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
		String expansion;
		int playerCount;
		int level;
		boolean virulentStrain;
		boolean mutationChallenge;
		boolean worldwidePanic;
		boolean labChallenge;

		@Override
		public String toString()
		{
			return expansion + "-" + playerCount + "p-" + level + "x" +
				(virulentStrain ? "-virulent_strain" : "") +
				(labChallenge ? "-lab_challenge" : "") +
				(mutationChallenge ? "-mutation_challenge" : "") +
				(worldwidePanic ? "-worldwide_panic" : "");
		}
		
		public boolean parseCurrentToken(JsonParser json)
			throws IOException
		{
			if (json.getCurrentName().equals("player_count")) {
				json.nextToken();
				playerCount = json.getIntValue();
				return true;
			}
			else if (json.getCurrentName().equals("level")) {
				json.nextToken();
				level = json.getIntValue();
				return true;
			}
			else if (json.getCurrentName().equals("expansion")) {
				json.nextToken();
				expansion = json.getText();
				return true;
			}
			else if (json.getCurrentName().equals("virulent_strain")) {
				json.nextToken();
				virulentStrain = json.getText().equals("true");
				return true;
			}
			else if (json.getCurrentName().equals("mutation_challenge")) {
				json.nextToken();
				mutationChallenge = json.getText().equals("true");
				return true;
			}
			else if (json.getCurrentName().equals("worldwide_panic")) {
				json.nextToken();
				worldwidePanic = json.getText().equals("true");
				return true;
			}
			else if (json.getCurrentName().equals("lab_challenge")) {
				json.nextToken();
				labChallenge = json.getText().equals("true");
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
