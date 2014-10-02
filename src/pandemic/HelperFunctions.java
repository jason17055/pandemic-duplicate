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
}
