// Cursor glow animation
const root = document.documentElement;
let currentX = 50, currentY = 50;
let targetX = 50, targetY = 50;
window.addEventListener("mousemove", (e) => {
    targetX = (e.clientX / window.innerWidth) * 100;
    targetY = (e.clientY / window.innerHeight) * 100;
});
function animate() {
    currentX += (targetX - currentX) * 0.12;
    currentY += (targetY - currentY) * 0.12;
    root.style.setProperty("--x", currentX + "%");
    root.style.setProperty("--y", currentY + "%");
    requestAnimationFrame(animate);
}
animate();
document.addEventListener("DOMContentLoaded", () => {
    const SOLANA_ASSISTANT_SYSTEM_PROMPT = `You are Ezer, a Solana-focused cryptocurrency chat assistant. Provide accurate, clear answers to any questions about cryptocurrency, the Solana blockchain, or trading Solana ecosystem tokens, including Solana memecoins. Explain complex concepts in simple terms, offering educational guidance on Solana-specific topics and memecoin trading strategies.

For multi-part or complex queries, use step-by-step reasoning before delivering your answers. Always prioritize accuracy, transparency, and up-to-date knowledge. If recent context is provided in the prompt, treat it as higher-priority than older internal knowledge. If you are unsure, clearly say so instead of guessing. If you encounter unclear or ambiguous queries, ask clarifying questions as needed before answering. Continue assisting or follow up with the user until their objectives are fully met.

Instructions:
- Prioritize reasoning, explanation, and transparency prior to making any conclusions or recommendations.
- When teaching memecoin trading on Solana:
  - Clearly explain terminology, risks, and mechanics.
  - Illustrate processes step-by-step.
  - Use examples with placeholders like [example token], [trade amount], or [DEX name] for processes or trade examples.
- Avoid providing investment advice or making specific financial recommendations.
- Respect all constants, user guidelines, and training data timeframes/limitations.
- If external context is provided, do not answer with a knowledge-cutoff disclaimer. Use the context and clearly state uncertainty only for missing details.

Output Format:
- Provide clear, concise, and educational responses.
- Use markdown formatting for clarity: bullets, numbered lists, section headings, and examples as needed.
- For step-by-step guides or explanations, use ordered or unordered lists.
- Use placeholders [like this] for generalizable examples.
- Keep responses conversational and accessible, suitable for both beginners and experienced users.`;
    const APP_CONFIG = (typeof window !== "undefined" && window.APP_CONFIG) || {};
    const OPENAI_API_KEY = APP_CONFIG.OPENAI_API_KEY || "";
    const CMC_API_KEY = APP_CONFIG.CMC_API_KEY || "";
    const CMC_QUOTES_URL = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest";
    // Match IDs from your `index.html`
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const chatContainer = document.getElementById("chat-container");
    const introContent = document.querySelector(".ai-container > .ai-message-content");
    let hasSentFirstMessage = false;
    if (!chatForm || !chatInput || !chatContainer)
        return;
    chatForm.addEventListener("submit", async (e) => {
        // Prevent page reload (the button is type="submit")
        e.preventDefault();
        await handleSend();
    });
    // Main flow: user submits -> show user message -> show typing -> fetch -> show bot reply.
    async function handleSend() {
        const userMessage = chatInput.value.trim();
        if (!userMessage)
            return;
        if (!hasSentFirstMessage) {
            hasSentFirstMessage = true;
            if (introContent)
                introContent.style.display = "none";
        }
        appendMessage(userMessage, "user");
        chatInput.value = "";
        setInputDisabled(true);
        const typingEl = appendTypingIndicator();
        try {
            const botMessage = await getBotResponse(userMessage);
            const formatted = formatAssistantText(botMessage || "Sorry, I couldn't generate a response.");
            await typewriterToElement(typingEl, formatted);
            typingEl.classList.remove("typing");
            typingEl.classList.add("typewriter-done");
        }
        catch (error) {
            console.error("Error fetching bot response:", error);
            const errText = error && error.message ? error.message : "";
            const msg = errText ||
                "Sorry, something went wrong. Please try again later (check the browser console).";
            await typewriterToElement(typingEl, formatAssistantText(msg));
            typingEl.classList.remove("typing");
            typingEl.classList.add("typewriter-done");
        }
        finally {
            // Always remove typing state even if something unexpected happens.
            setInputDisabled(false);
            chatInput.focus();
        }
    }
    function setInputDisabled(isDisabled) {
        chatInput.disabled = isDisabled;
        if (sendBtn)
            sendBtn.disabled = isDisabled;
    }
    function appendMessage(message, sender, options) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender);
        if (options && options.isTyping) {
            messageElement.classList.add("typing");
        }
        messageElement.textContent = message;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return messageElement;
    }
    function appendTypingIndicator() {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", "bot", "typing");
        messageElement.innerHTML = `
      <span class="typing-dots" aria-label="Assistant is typing">
        <span></span><span></span><span></span>
      </span>
    `;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return messageElement;
    }
    async function typewriterToElement(element, text) {
        if (!element)
            return;
        element.textContent = "";
        const safeText = String(text || "");
        const delayMs = getTypewriterDelay(safeText.length);
        for (let i = 0; i < safeText.length; i += 1) {
            element.textContent += safeText[i];
            chatContainer.scrollTop = chatContainer.scrollHeight;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    function getTypewriterDelay(length) {
        if (length > 1400)
            return 1;
        if (length > 800)
            return 2;
        if (length > 450)
            return 4;
        if (length > 250)
            return 7;
        return 12;
    }
    function formatAssistantText(text) {
        let value = String(text || "").replace(/\r\n/g, "\n").trim();
        if (!value)
            return "";
        value = stripMarkdownNoise(value);
        // Keep existing spacing clean.
        value = value.replace(/\n{3,}/g, "\n\n");
        const hasStructuredBlocks = /(^|\n)\s*([-*]\s+|\d+\.\s+)/m.test(value) || value.includes("\n\n");
        // If response is one long block, split into shorter readable paragraphs.
        if (!hasStructuredBlocks && value.length > 280) {
            const sentences = value.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g);
            if (sentences && sentences.length > 2) {
                const paragraphs = [];
                for (let i = 0; i < sentences.length; i += 2) {
                    paragraphs.push(sentences.slice(i, i + 2).join(" ").trim());
                }
                value = paragraphs.join("\n\n");
            }
        }
        return value;
    }
    function stripMarkdownNoise(text) {
        let value = String(text || "");
        // Convert markdown headings to plain section titles.
        value = value.replace(/^\s{0,3}#{1,6}\s+/gm, "");
        // Normalize bullet markers.
        value = value.replace(/^\s*[-*]\s+/gm, "• ");
        // Remove bold/italic/code markers while keeping content.
        value = value
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .replace(/\*(.*?)\*/g, "$1")
            .replace(/`([^`]+)`/g, "$1");
        // Remove markdown blockquote markers.
        value = value.replace(/^\s*>\s?/gm, "");
        // Collapse excessive blank lines created by conversions.
        value = value.replace(/\n{3,}/g, "\n\n");
        return value.trim();
    }
    async function getBotResponse(userMessage) {
        const apiKey = OPENAI_API_KEY;
        if (!apiKey || apiKey === "YOUR_OPENAI_API_KEY") {
            throw new Error("Missing OpenAI API key. Set `OPENAI_API_KEY` in your .env file.");
        }
        const apiUrl = "https://api.openai.com/v1/chat/completions";
        const priceQuery = extractPriceQuery(userMessage);
        if (priceQuery) {
            return getCryptoPriceResponse(priceQuery);
        }
        const freshContext = await fetchFreshContext(userMessage);
        const messages = [
            { role: "system", content: SOLANA_ASSISTANT_SYSTEM_PROMPT },
        ];
        if (freshContext) {
            messages.push({
                role: "system",
                content: `Recent external context (fetched at ${new Date().toISOString()}):\n` +
                    `${freshContext}\n\n` +
                    "Prefer this recent context for current-events questions.",
            });
        }
        messages.push({ role: "user", content: userMessage });
        let firstReply = await requestOpenAIReply(apiUrl, apiKey, messages);
        // Retry once with forced web context if response sounds like stale-knowledge fallback.
        if (looksLikeKnowledgeCutoffReply(firstReply)) {
            const forcedContext = freshContext || (await fetchFreshContext(userMessage, true));
            if (forcedContext) {
                const retryMessages = [
                    { role: "system", content: SOLANA_ASSISTANT_SYSTEM_PROMPT },
                    {
                        role: "system",
                        content: `Verified external context (fetched at ${new Date().toISOString()}):\n` +
                            `${forcedContext}\n\n` +
                            "Answer directly using this context. Do not include knowledge-cutoff disclaimers.",
                    },
                    { role: "user", content: userMessage },
                ];
                const retriedReply = await requestOpenAIReply(apiUrl, apiKey, retryMessages);
                if (retriedReply)
                    return retriedReply;
            }
        }
        return firstReply || "Sorry, I couldn't generate a response.";
    }
    async function requestOpenAIReply(apiUrl, apiKey, messages) {
        const response = await fetch(apiUrl, {
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
        if (!response.ok) {
            // Try to show a useful error message.
            let details = "";
            try {
                const errData = await response.json();
                if (errData &&
                    errData.error &&
                    typeof errData.error.message === "string") {
                    details = errData.error.message;
                }
            }
            catch {
                try {
                    details = await response.text();
                }
                catch { }
            }
            const fallback = `OpenAI request failed (${response.status})`;
            throw new Error(details || fallback);
        }
        const data = await response.json();
        if (data &&
            data.choices &&
            data.choices[0] &&
            data.choices[0].message &&
            typeof data.choices[0].message.content === "string") {
            return data.choices[0].message.content.trim();
        }
        return "";
    }
    function extractPriceQuery(message) {
        const text = String(message || "").trim();
        if (!text)
            return null;
        // Match common prompts like:
        // "price of bitcoin", "what is SOL price", "btc price", "how much is ethereum"
        const patterns = [
            /(?:price\s+of|price\s+for)\s+([a-z0-9.\- ]{2,30})/i,
            /(?:what(?:'s| is)\s+the\s+price\s+of)\s+([a-z0-9.\- ]{2,30})/i,
            /(?:how\s+much\s+is)\s+([a-z0-9.\- ]{2,30})/i,
            /^([a-z0-9.\-]{2,15})\s+price\??$/i,
        ];
        for (let i = 0; i < patterns.length; i += 1) {
            const match = text.match(patterns[i]);
            if (match && match[1]) {
                return cleanCoinIdentifier(match[1]);
            }
        }
        return null;
    }
    function cleanCoinIdentifier(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/[^\w.\- ]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }
    function coinNameToSymbol(name) {
        const map = {
            bitcoin: "BTC",
            ethereum: "ETH",
            solana: "SOL",
            tether: "USDT",
            ripple: "XRP",
            bnb: "BNB",
            dogecoin: "DOGE",
            cardano: "ADA",
            tron: "TRX",
            avalanche: "AVAX",
            sui: "SUI",
            pepe: "PEPE",
            bonk: "BONK",
            wif: "WIF",
            "dogwifhat": "WIF",
            "dog wif hat": "WIF",
        };
        return map[name] || null;
    }
    async function getCryptoPriceResponse(identifier) {
        if (!CMC_API_KEY || CMC_API_KEY === "YOUR_COINMARKETCAP_API_KEY") {
            return "I need a CoinMarketCap API key to fetch live prices. Set `CMC_API_KEY` in your .env file and try again.";
        }
        const maybeSymbol = identifier.toUpperCase().replace(/\s+/g, "");
        const mappedSymbol = coinNameToSymbol(identifier);
        const symbol = mappedSymbol || maybeSymbol;
        try {
            const data = await fetchCoinMarketCapQuote(symbol);
            if (!data) {
                return `I couldn't find live price data for "${identifier}". Try a ticker symbol like BTC, ETH, or SOL.`;
            }
            const usd = data.quote && data.quote.USD ? data.quote.USD : null;
            if (!usd || typeof usd.price !== "number") {
                return `I found "${data.name}" but couldn't read its USD quote right now.`;
            }
            const price = formatUsd(usd.price);
            const change24h = typeof usd.percent_change_24h === "number"
                ? `${usd.percent_change_24h.toFixed(2)}%`
                : "N/A";
            const marketCap = typeof usd.market_cap === "number" ? formatUsd(usd.market_cap) : "N/A";
            return `**Lyceum Assistant** live quote (CoinMarketCap):\n- **Asset:** ${data.name} (${data.symbol})\n- **Price (USD):** ${price}\n- **24h Change:** ${change24h}\n- **Market Cap:** ${marketCap}`;
        }
        catch (error) {
            const message = error && error.message ? error.message : "Unknown CMC API error";
            return `I couldn't fetch live price data from CoinMarketCap right now: ${message}`;
        }
    }
    async function fetchCoinMarketCapQuote(symbol) {
        const url = `${CMC_QUOTES_URL}?symbol=${encodeURIComponent(symbol)}&convert=USD`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "X-CMC_PRO_API_KEY": CMC_API_KEY,
            },
        });
        if (!response.ok) {
            let details = "";
            try {
                const errData = await response.json();
                if (errData && errData.status && errData.status.error_message) {
                    details = errData.status.error_message;
                }
            }
            catch { }
            throw new Error(details || `CMC request failed (${response.status})`);
        }
        const payload = await response.json();
        if (!payload || !payload.data || !payload.data[symbol]) {
            return null;
        }
        return payload.data[symbol];
    }
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
        if (!text)
            return false;
        return /^(what is|who is|what are|who are|are you familiar with|tell me about|explain)\b/.test(text);
    }
    function looksLikeKnowledgeCutoffReply(reply) {
        const text = String(reply || "").toLowerCase();
        return (text.includes("as of my last knowledge") ||
            text.includes("knowledge cutoff") ||
            text.includes("i'm not specifically familiar") ||
            text.includes("i'm not familiar") ||
            text.includes("i do not have real-time"));
    }
    function shouldFetchFreshContext(query) {
        return needsFreshContext(query) || isFactualLookupQuery(query);
    }
    async function fetchFreshContext(query, forceFetch = false) {
        if (!forceFetch && !shouldFetchFreshContext(query))
            return "";
        const snippets = [];
        // Fresh crypto market snapshot (public API)
        try {
            const marketRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true");
            if (marketRes.ok) {
                const market = await marketRes.json();
                const marketLine = [
                    market.solana ? `SOL ${formatUsd(market.solana.usd)} (${Number(market.solana.usd_24h_change || 0).toFixed(2)}% 24h)` : null,
                    market.bitcoin ? `BTC ${formatUsd(market.bitcoin.usd)} (${Number(market.bitcoin.usd_24h_change || 0).toFixed(2)}% 24h)` : null,
                    market.ethereum ? `ETH ${formatUsd(market.ethereum.usd)} (${Number(market.ethereum.usd_24h_change || 0).toFixed(2)}% 24h)` : null,
                ].filter(Boolean).join(" | ");
                if (marketLine)
                    snippets.push(`Market snapshot: ${marketLine}`);
            }
        }
        catch { }
        // Quick public web summary
        try {
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
            const webRes = await fetch(ddgUrl);
            if (webRes.ok) {
                const web = await webRes.json();
                if (web && typeof web.AbstractText === "string" && web.AbstractText.trim()) {
                    snippets.push(`Web summary: ${web.AbstractText.trim()}`);
                }
                else if (Array.isArray(web.RelatedTopics) && web.RelatedTopics.length > 0) {
                    const firstText = web.RelatedTopics.find((t) => typeof t.Text === "string" && t.Text)?.Text || "";
                    if (firstText)
                        snippets.push(`Related topic: ${firstText}`);
                }
            }
        }
        catch { }
        // Wikipedia summary fallback for basic "what is / who is" style questions.
        try {
            const topicGuess = String(query || "")
                .replace(/^(what is|who is|what are|who are|are you familiar with|tell me about|explain)\s+/i, "")
                .replace(/[?!.]+$/g, "")
                .trim();
            if (topicGuess) {
                const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topicGuess)}`;
                const wikiRes = await fetch(wikiUrl);
                if (wikiRes.ok) {
                    const wiki = await wikiRes.json();
                    if (wiki && typeof wiki.extract === "string" && wiki.extract.trim()) {
                        snippets.push(`Wikipedia summary: ${wiki.extract.trim()}`);
                    }
                }
            }
        }
        catch { }
        return snippets.join("\n");
    }
});
