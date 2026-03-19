module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Method not allowed" } });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    res.status(500).json({ error: { message: "Missing OPENAI_API_KEY on server." } });
    return;
  }

  const messages = Array.isArray(req.body && req.body.messages) ? req.body.messages : null;
  if (!messages || messages.length === 0) {
    res.status(400).json({ error: { message: "Missing messages payload." } });
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const message = data && data.error && data.error.message
        ? data.error.message
        : `OpenAI request failed (${response.status})`;
      res.status(response.status).json({ error: { message } });
      return;
    }

    const content =
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      typeof data.choices[0].message.content === "string"
        ? data.choices[0].message.content.trim()
        : "";

    res.status(200).json({ content });
  } catch (error) {
    res.status(500).json({
      error: {
        message: error && error.message ? error.message : "Unknown server error.",
      },
    });
  }
};
