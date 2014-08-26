package pandemic.gui;

import java.awt.*;
import java.awt.event.*;
import java.awt.image.*;
import java.io.File;
import java.io.IOException;
import javax.imageio.ImageIO;
import javax.swing.*;
import javax.swing.event.*;
import javax.vecmath.*;

public class PlanetView extends JComponent
{
	BufferedImage img;
	BufferedImage refImg;
	Matrix3d rotationMatrix;
	Matrix3d inverseMatrix;

	double curLongitude;
	double curLatitude;

	public PlanetView()
	{
		try {
			refImg = ImageIO.read(new File("world_map.png"));
		}
		catch (IOException e) {
			e.printStackTrace(System.err);
			System.exit(1);
		}

		setMatrices();

		img = new BufferedImage(512, 512, BufferedImage.TYPE_INT_RGB);
		update();

		addAncestorListener(new AncestorListener() {
			public void ancestorAdded(AncestorEvent evt) { startTimer(); }
			public void ancestorMoved(AncestorEvent evt) {}
			public void ancestorRemoved(AncestorEvent evt) { stopTimer(); }
			});
	}

	Timer rotationTimer;
	void startTimer()
	{
		System.out.println("starting timer");
		rotationTimer = new Timer(200,
			new ActionListener() {
			public void actionPerformed(ActionEvent evt) {
				rotateSome();
			}});
		rotationTimer.start();
	}

	void stopTimer()
	{
		System.out.println("stopping timer");
		rotationTimer.stop();
		rotationTimer = null;
	}

	void rotateSome()
	{
		curLongitude -= Math.toRadians(2);
		curLatitude = Math.sin(-curLongitude/5.0) * Math.toRadians(23.5);
		setMatrices();
		update();
	}

	void setMatrices()
	{
		Matrix3d m1 = new Matrix3d();
		m1.rotZ(curLongitude);

		Matrix3d m2 = new Matrix3d();
		m2.rotX(Math.PI/2.0 - curLatitude);

		rotationMatrix = new Matrix3d();
		rotationMatrix.set(m2);
		rotationMatrix.mul(m1);

		inverseMatrix = new Matrix3d(rotationMatrix);
		inverseMatrix.invert();
	}

	@Override
	public Dimension getPreferredSize()
	{
		return new Dimension(512,512);
	}

	@Override
	public void paintComponent(Graphics g)
	{
		g.drawImage(img, 0, 0, null);
	}

	void update()
	{
		int w = img.getWidth();
		int h = img.getHeight();
		for (int y = 0; y < h; y++) {
			for (int x = 0; x < w; x++) {
				Point2d p = pointFromPixel(x, y);
				if (p == null) {
					img.setRGB(x, y, 0);
				}
				else {
					int tx = (int)Math.round((1-p.x) * (refImg.getWidth()-1));
					int ty = (int)Math.round((1-p.y) * (refImg.getHeight()-1));
				assert tx >= 0 && tx < refImg.getWidth() : "p.x was "+p.x;
				assert ty >= 0 && ty < refImg.getHeight() : "p.y was "+p.y;

					img.setRGB(x, y,
						refImg.getRGB(tx, ty)
						);
				}
			}
		}
		repaint();
	}

	Point2d pointFromPixel(int x, int y)
	{
		Point3d pt = new Point3d(x-img.getWidth()/2, y-img.getHeight()/2, 0);
		pt.scale(1.0/256.0);

		// find Z such that x^2 + y^2 + z^2 = 1.0
		double r = 1.0 - (Math.pow(pt.x,2.0) + Math.pow(pt.y,2.0));
		if (r >= 0.0) {
			pt.z = Math.sqrt(r);
		}
		else {
			return null;
		}

		// apply rotation(s)
		inverseMatrix.transform(pt);

		double lgt = Math.atan2(pt.y, pt.x);
		double lat = Math.asin(pt.z);
		return new Point2d(
			(lgt/Math.PI + 1.0)/2.0,
			(lat/Math.PI) + 0.5
			);
	}
}
