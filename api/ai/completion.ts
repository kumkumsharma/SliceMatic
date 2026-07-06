export default async function handler(req: any, res: any) {
  // Configure CORS headers for the serverless function environment
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

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
    console.error("Serverless API handler error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
