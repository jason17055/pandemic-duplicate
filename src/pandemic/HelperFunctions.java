package pandemic;

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
}
