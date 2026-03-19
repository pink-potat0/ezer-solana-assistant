const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

function getErrorMessage(error, fallbackMessage) {
  return error && typeof error.message === "string" && error.message.trim()
    ? error.message
    : fallbackMessage;
}

function normalizeMessages(body) {
  if (!body || typeof body !== "object") return null;
  const { messages } = body;
  return Array.isArray(messages) && messages.length > 0 ? messages : null;
}

function getAssistantContent(payload) {
  if (
    payload &&
    payload.choices &&
    payload.choices[0] &&
    payload.choices[0].message &&
    typeof payload.choices[0].message.content === "string"
  ) {
    return payload.choices[0].message.content.trim();
  }
  return "";
}

async function handleChatRequest(req, res) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    res.status(500).json({ error: { message: "Missing OPENAI_API_KEY on server." } });
    return;
  }

  const messages = normalizeMessages(req.body);
  if (!messages) {
    res.status(400).json({ error: { message: "Missing messages payload." } });
    return;
  }

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const upstreamMessage =
        payload && payload.error && typeof payload.error.message === "string"
          ? payload.error.message
          : `OpenAI request failed (${response.status})`;
      res.status(response.status).json({ error: { message: upstreamMessage } });
      return;
    }

    res.status(200).json({ content: getAssistantContent(payload) });
  } catch (error) {
    res.status(500).json({
      error: { message: getErrorMessage(error, "Unknown server error.") },
    });
  }
}

module.exports = { handleChatRequest };
