package pandemic;

import java.io.*;
import javax.script.*;

public class TestGenerator
{
	public static void main(String [] args) throws Exception
	{
		ScriptEngine js = new ScriptEngineManager().getEngineByName("javascript");
		Bindings bindings = js.getBindings(ScriptContext.ENGINE_SCOPE);

		FileReader r1 = new FileReader("webapp/sha1.js");
		js.eval(r1);

		FileReader r2 = new FileReader("webapp/pandemic-game.js");
		js.eval(r2);

		bindings.put("stdout", System.out);
		js.eval("stdout.println(JSON.stringify(generate_scenario_real(parse_rules('on_the_brink-4p-6x'))));");
	}
}
