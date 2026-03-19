const COINGECKO_SIMPLE_PRICE = "https://api.coingecko.com/api/v3/simple/price";

const COIN_ID_BY_KEYWORD = {
  btc: "bitcoin",
  bitcoin: "bitcoin",
  eth: "ethereum",
  ethereum: "ethereum",
  sol: "solana",
  solana: "solana",
  doge: "dogecoin",
  dogecoin: "dogecoin",
  bonk: "bonk",
  pepe: "pepe",
  wif: "dogwifcoin",
  "dogwifhat": "dogwifcoin",
  "dog wif hat": "dogwifcoin",
};

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 8 : 2,
  }).format(value);
}

function cleanCoinIdentifier(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w.\- ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPriceQuery(message) {
  const text = String(message || "").trim();
  if (!text) return null;

  const patterns = [
    /(?:price\s+of|price\s+for)\s+([a-z0-9.\- ]{2,30})/i,
    /(?:what(?:'s| is)\s+the\s+price\s+of)\s+([a-z0-9.\- ]{2,30})/i,
    /(?:how\s+much\s+is)\s+([a-z0-9.\- ]{2,30})/i,
    /^([a-z0-9.\-]{2,15})\s+price\??$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return cleanCoinIdentifier(match[1]);
  }

  return null;
}

function resolveCoinId(identifier) {
  const compact = identifier.replace(/\s+/g, "");
  return COIN_ID_BY_KEYWORD[identifier] || COIN_ID_BY_KEYWORD[compact] || null;
}

async function getCryptoPriceResponse(identifier) {
  const coinId = resolveCoinId(identifier);
  if (!coinId) {
    return `I can fetch live prices for supported coins. Try BTC, ETH, SOL, BONK, PEPE, or WIF.`;
  }

  try {
    const url =
      `${COINGECKO_SIMPLE_PRICE}?ids=${encodeURIComponent(coinId)}` +
      "&vs_currencies=usd&include_24hr_change=true";
    const response = await fetch(url);
    if (!response.ok) {
      return `Live market data is unavailable right now (status ${response.status}).`;
    }

    const payload = await response.json();
    const data = payload && payload[coinId];
    if (!data || typeof data.usd !== "number") {
      return `I couldn't find live price data for "${identifier}".`;
    }

    const price = formatUsd(data.usd);
    const change24h =
      typeof data.usd_24h_change === "number" ? `${data.usd_24h_change.toFixed(2)}%` : "N/A";

    return `Live quote (CoinGecko):\n- Asset: ${coinId}\n- Price (USD): ${price}\n- 24h Change: ${change24h}`;
  } catch (error) {
    const message = error && error.message ? error.message : "Unknown market data error";
    return `I couldn't fetch live price data right now: ${message}`;
  }
}

export { extractPriceQuery, getCryptoPriceResponse };
