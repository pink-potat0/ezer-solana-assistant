import { API_CHAT_ENDPOINT, SYSTEM_PROMPT } from "./config.js";
import { fetchFreshContext, looksLikeKnowledgeCutoffReply } from "./context.js";
import { extractPriceQuery, getCryptoPriceResponse } from "./marketData.js";

async function requestAssistantReply(messages) {
  const response = await fetch(API_CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    let details = "";
    try {
      const errData = await response.json();
      if (errData && errData.error && typeof errData.error.message === "string") {
        details = errData.error.message;
      }
    } catch {
      try {
        details = await response.text();
      } catch {}
    }

    throw new Error(details || `Assistant request failed (${response.status})`);
  }

  const data = await response.json();
  return data && typeof data.content === "string" ? data.content.trim() : "";
}

async function getBotResponse(userMessage) {
  const priceQuery = extractPriceQuery(userMessage);
  if (priceQuery) return getCryptoPriceResponse(priceQuery);

  const freshContext = await fetchFreshContext(userMessage);
  const messages = [{ role: "system", content: SYSTEM_PROMPT }];

  if (freshContext) {
    messages.push({
      role: "system",
      content:
        `Recent external context (fetched at ${new Date().toISOString()}):\n` +
        `${freshContext}\n\n` +
        "Prefer this recent context for current-events questions.",
    });
  }

  messages.push({ role: "user", content: userMessage });
  const firstReply = await requestAssistantReply(messages);

  if (!looksLikeKnowledgeCutoffReply(firstReply)) {
    return firstReply || "Sorry, I couldn't generate a response.";
  }

  const forcedContext = freshContext || (await fetchFreshContext(userMessage, true));
  if (!forcedContext) return firstReply || "Sorry, I couldn't generate a response.";

  const retryMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content:
        `Verified external context (fetched at ${new Date().toISOString()}):\n` +
        `${forcedContext}\n\n` +
        "Answer directly using this context. Do not include knowledge-cutoff disclaimers.",
    },
    { role: "user", content: userMessage },
  ];

  const retriedReply = await requestAssistantReply(retryMessages);
  return retriedReply || firstReply || "Sorry, I couldn't generate a response.";
}

export { getBotResponse };
