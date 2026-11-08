
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API key is not configured"
    });
  }

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Please send a message"
      });
    }

    const contents = messages.slice(-12).map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{
        text: String(item.text || "").slice(0, 10000)
      }]
    }));

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" +
      encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "You are AIVORA AI, a helpful and intelligent assistant. Answer clearly in the language used by the user. Be accurate, respectful and helpful."
            }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(502).json({
        error: "AI provider request failed"
      });
    }

    const reply = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("");

    if (!reply) {
      return res.status(502).json({
        error: "AI returned an empty response"
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Backend error:", error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
}
