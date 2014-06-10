package pandemic;

import java.io.*;
import javax.servlet.http.*;
import com.fasterxml.jackson.core.*;
import com.google.appengine.api.datastore.*;
import java.util.logging.Logger;

public class PandemicDealServlet extends HttpServlet
{
	private static final Logger log = Logger.getLogger(PandemicDealServlet.class.getName());

	@Override
	public void doGet(HttpServletRequest req, HttpServletResponse resp)
		throws IOException
	{
		resp.setContentType("text/json;charset=UTF-8");
		JsonGenerator out = new JsonFactory().
			createJsonGenerator(resp.getWriter()
			);
		out.writeStartObject();
		out.writeStringField("protocolVersion", "1");
		out.writeEndObject();
		out.close();
	}
}
