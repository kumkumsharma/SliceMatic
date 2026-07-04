import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Seed database with demo orders if empty
  try {
    await db.seedDemoDataIfEmpty();
  } catch (seedErr) {
    console.warn('Silent seeding check skipped:', seedErr);
  }

  // 1. Menu API
  app.get('/api/menu', async (_req: Request, res: Response) => {
    try {
      const menu = await db.getMenu();
      res.json(menu);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Orders API (Create)
  app.post('/api/orders', async (req: Request, res: Response) => {
    try {
      const { customerName, phone, subtotal, discount, gst, finalTotal, paymentMode, items } = req.body;

      if (!customerName || !phone || !items || items.length === 0) {
        res.status(400).json({ error: 'Missing required order details' });
        return;
      }

      const placedOrder = await db.addOrder({
        customer_name: customerName,
        phone,
        subtotal: parseFloat(subtotal),
        discount: parseFloat(discount),
        gst: parseFloat(gst),
        final_total: parseFloat(finalTotal),
        payment_mode: paymentMode
      }, items);

      res.status(201).json(placedOrder);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Orders API (List)
  app.get('/api/orders', async (_req: Request, res: Response) => {
    try {
      const orders = await db.getOrders();
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Simple Admin Auth API (Fallback/Mock Authentication for Preview)
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    // Hardcoded credentials for quick administrative login in the preview
    if (email === 'admin@slicematic.com' && password === 'password123') {
      res.json({
        success: true,
        user: { email: 'admin@slicematic.com', name: 'Rajan Sharma' },
        token: 'mock-jwt-token-slicematic'
      });
    } else {
      res.status(401).json({ error: 'Invalid admin credentials. Use admin@slicematic.com and password123.' });
    }
  });

  // 5. Gemini AI Business Insights API
  app.post('/api/ai/insights', async (_req: Request, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(400).json({
          error: 'Gemini API key is not configured. Please add it via the Secrets panel in AI Studio.'
        });
        return;
      }

      // Initialize the modern @google/genai SDK
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Gather current sales data to feed the model
      const orders = await db.getOrders();
      const menu = await db.getMenu();

      // Formulate a compact statistical digest
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + o.final_total, 0);
      const totalDiscounts = orders.reduce((sum, o) => sum + o.discount, 0);

      const crustCounts: Record<string, number> = {};
      const pizzaCounts: Record<string, number> = {};
      const toppingCounts: Record<string, number> = {};
      const paymentCounts: Record<string, number> = {};

      orders.forEach(o => {
        paymentCounts[o.payment_mode] = (paymentCounts[o.payment_mode] || 0) + 1;
        o.order_items?.forEach(item => {
          if (item.base_name) crustCounts[item.base_name] = (crustCounts[item.base_name] || 0) + item.quantity;
          if (item.pizza_name) pizzaCounts[item.pizza_name] = (pizzaCounts[item.pizza_name] || 0) + item.quantity;
          if (item.topping_name) toppingCounts[item.topping_name] = (toppingCounts[item.topping_name] || 0) + item.quantity;
        });
      });

      const prompt = `
You are an expert restaurant operations and sales consultant analyzing the POS performance for "SliceMatic Pizza".
Here is the current restaurant performance data:
- Total Orders: ${totalOrders}
- Total Revenue: ₹${totalRevenue.toFixed(2)}
- Total Discounts Applied: ₹${totalDiscounts.toFixed(2)}
- Most Popular Crusts/Bases: ${JSON.stringify(crustCounts)}
- Most Popular Pizzas Ordered: ${JSON.stringify(pizzaCounts)}
- Most Popular Toppings Added: ${JSON.stringify(toppingCounts)}
- Preferred Payment Modes: ${JSON.stringify(paymentCounts)}

Please compile a highly professional, strategic, and direct business insights report.
Your report MUST contain:
1. **Executive Summary**: A punchy 2-sentence overview of overall sales performance.
2. **Key Strengths**: Identify what is selling best (favorite pizza combos, high-margin toppings) and why.
3. **Optimizations & Strategies**: Actionable recommendations (e.g. promoting a underperforming high-margin crust, refining pricing, optimizing prep hours based on trends, target bundles).
4. **Discount Effectiveness**: Evaluate if the "10% off on 5+ pizzas" bulk promo is encouraging larger orders or reducing margins unnecessarily, with advice on next steps.

Format your response in beautiful, clean Markdown with clear section headings, bullet points, and highlight metrics using bold text. Do not mention system paths, file details, or technical jargon. Keep the tone inspiring, analytical, and tailored to owner Rajan Sharma.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      res.json({ insights: response.text });
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      res.status(500).json({ error: `AI Generation failed: ${err.message}` });
    }
  });

  // 6. Serve static files / Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express Server running on port ${PORT}`);
  });
}

startServer();
