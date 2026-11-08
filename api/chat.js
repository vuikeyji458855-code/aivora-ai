export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY missing"
    });
  }

  try {
    let body = req.body || {};

    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const messages = Array.isArray(body.messages)
      ? body.messages
      : body.message
        ? [{ role: "user", text: body.message }]
        : [];

    if (!messages.length) {
      return res.status(400).json({
        error: "Please send a message"
      });
    }

    const contents = messages.slice(-12).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.text || "") }]
    }));

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
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
  console.error("Gemini error:", response.status, data);

  return res.status(502).json({
    error: data?.error?.message || "Gemini API request failed",
    googleStatus: response.status
  });
    }

    const reply = data.candidates?.[0]?.content?.parts
      ?.map(p => p.text || "")
      .join("");

    if (!reply) {
      return res.status(502).json({
        error: "Empty AI response"
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Backend error"
    });
  }
}
