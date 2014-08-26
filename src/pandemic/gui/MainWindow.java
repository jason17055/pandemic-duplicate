package pandemic.gui;

import java.awt.*;
import javax.swing.*;

public class MainWindow extends JFrame
{
	PlanetView view;

	public MainWindow()
	{
		super("Pandemic");

		view = new PlanetView();
		add(view, BorderLayout.CENTER);

		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		setLocationRelativeTo(null);
		pack();
	}

	public static void main(String [] args)
	{
		new MainWindow().setVisible(true);
	}
}
