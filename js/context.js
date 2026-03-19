function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 8 : 2,
  }).format(value);
}

function needsFreshContext(query) {
  const text = String(query || "").toLowerCase();
  return /(latest|today|current|recent|news|update|2025|2026|now|this week|right now)/.test(text);
}

function isFactualLookupQuery(query) {
  const text = String(query || "").toLowerCase().trim();
  if (!text) return false;
  return /^(what is|who is|what are|who are|are you familiar with|tell me about|explain)\b/.test(text);
}

function shouldFetchFreshContext(query) {
  return needsFreshContext(query) || isFactualLookupQuery(query);
}

function looksLikeKnowledgeCutoffReply(reply) {
  const text = String(reply || "").toLowerCase();
  return (
    text.includes("as of my last knowledge") ||
    text.includes("knowledge cutoff") ||
    text.includes("i'm not specifically familiar") ||
    text.includes("i'm not familiar") ||
    text.includes("i do not have real-time")
  );
}

async function fetchFreshContext(query, forceFetch = false) {
  if (!forceFetch && !shouldFetchFreshContext(query)) return "";

  const snippets = [];

  try {
    const marketRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true",
    );
    if (marketRes.ok) {
      const market = await marketRes.json();
      const marketLine = [
        market.solana
          ? `SOL ${formatUsd(market.solana.usd)} (${Number(market.solana.usd_24h_change || 0).toFixed(2)}% 24h)`
          : null,
        market.bitcoin
          ? `BTC ${formatUsd(market.bitcoin.usd)} (${Number(market.bitcoin.usd_24h_change || 0).toFixed(2)}% 24h)`
          : null,
        market.ethereum
          ? `ETH ${formatUsd(market.ethereum.usd)} (${Number(market.ethereum.usd_24h_change || 0).toFixed(2)}% 24h)`
          : null,
      ]
        .filter(Boolean)
        .join(" | ");

      if (marketLine) snippets.push(`Market snapshot: ${marketLine}`);
    }
  } catch {}

  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
    const webRes = await fetch(ddgUrl);
    if (webRes.ok) {
      const web = await webRes.json();
      if (web && typeof web.AbstractText === "string" && web.AbstractText.trim()) {
        snippets.push(`Web summary: ${web.AbstractText.trim()}`);
      } else if (Array.isArray(web.RelatedTopics) && web.RelatedTopics.length > 0) {
        const firstText =
          web.RelatedTopics.find((topic) => typeof topic.Text === "string" && topic.Text)?.Text || "";
        if (firstText) snippets.push(`Related topic: ${firstText}`);
      }
    }
  } catch {}

  try {
    const topicGuess = String(query || "")
      .replace(/^(what is|who is|what are|who are|are you familiar with|tell me about|explain)\s+/i, "")
      .replace(/[?!.]+$/g, "")
      .trim();

    if (topicGuess) {
      const wikiRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topicGuess)}`,
      );
      if (wikiRes.ok) {
        const wiki = await wikiRes.json();
        if (wiki && typeof wiki.extract === "string" && wiki.extract.trim()) {
          snippets.push(`Wikipedia summary: ${wiki.extract.trim()}`);
        }
      }
    }
  } catch {}

  return snippets.join("\n");
}

export { fetchFreshContext, looksLikeKnowledgeCutoffReply };
