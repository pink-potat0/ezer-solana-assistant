const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const ALLOWED_ROLES = new Set(["system", "user", "assistant"]);
const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 8000;

function getErrorMessage(error, fallbackMessage) {
  return error && typeof error.message === "string" && error.message.trim()
    ? error.message
    : fallbackMessage;
}

function sanitizeMessages(body) {
  if (!body || typeof body !== "object" || !Array.isArray(body.messages)) {
    return { ok: false, reason: "Request body must include a messages array." };
  }

  if (body.messages.length === 0) {
    return { ok: false, reason: "Messages array is empty." };
  }

  if (body.messages.length > MAX_MESSAGES) {
    return { ok: false, reason: `Too many messages. Max allowed is ${MAX_MESSAGES}.` };
  }

  const sanitized = [];
  for (const item of body.messages) {
    if (!item || typeof item !== "object") {
      return { ok: false, reason: "Each message must be an object." };
    }

    const role = typeof item.role === "string" ? item.role.trim() : "";
    const content = typeof item.content === "string" ? item.content.trim() : "";
    if (!ALLOWED_ROLES.has(role)) {
      return { ok: false, reason: `Unsupported message role: "${role || "unknown"}".` };
    }
    if (!content) {
      return { ok: false, reason: "Message content cannot be empty." };
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      return {
        ok: false,
        reason: `Message content exceeds ${MAX_MESSAGE_CHARS} characters.`,
      };
    }

    sanitized.push({ role, content });
  }

  return { ok: true, messages: sanitized };
}

async function requestOpenAICompletion(apiKey, messages) {
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
  return { response, payload };
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

  const validation = sanitizeMessages(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: { message: validation.reason } });
    return;
  }

  try {
    const { response, payload } = await requestOpenAICompletion(apiKey, validation.messages);
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
