import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON payloads
  app.use(express.json());

  // Proxy endpoint for OpenRouter LLM completions
  app.post("/api/ai/completion", async (req, res) => {
    try {
      const { systemPrompt, prompt } = req.body;
      if (!systemPrompt || !prompt) {
        return res.status(400).json({ error: "systemPrompt and prompt are required" });
      }

      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        console.error("OPENROUTER_API_KEY is not defined on the server.");
        return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured on the server." });
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://ai.studio/build",
          "X-Title": "SliceMatic POS"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenRouter API error (status ${response.status}):`, errorText);
        return res.status(response.status).json({ error: `OpenRouter request failed: ${errorText}` });
      }

      const data = await response.json();
      if (!data.choices || data.choices.length === 0) {
        return res.status(502).json({ error: "Invalid response structure received from OpenRouter." });
      }

      const content = data.choices[0].message.content;
      return res.json({ content });
    } catch (err: any) {
      console.error("Server API handler error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
