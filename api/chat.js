export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Gemini API key is not configured" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }
    body = body || {};

    let contents = [];
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      contents = body.messages.slice(-10).map((item) => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: String(item.text || item.content || "") }]
      }));
    } else if (body.message || body.prompt || body.text) {
      const userText = String(body.message || body.prompt || body.text);
      contents = [
        {
          role: "user",
          parts: [{ text: userText }]
        }
      ];
    } else {
      return res.status(400).json({ error: "Please send a message" });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "You are AIVORA AI, a helpful and intelligent assistant. Answer clearly and concisely." }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || "AI provider request failed";
      return res.status(response.status || 500).json({ error: errMsg });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      return res.status(502).json({ error: "AI returned an empty response" });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
