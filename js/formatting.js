function stripMarkdownNoise(text) {
  let value = String(text || "");
  value = value.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  value = value.replace(/^\s*[-*]\s+/gm, "• ");
  value = value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
  value = value.replace(/^\s*>\s?/gm, "");
  value = value.replace(/\n{3,}/g, "\n\n");
  return value.trim();
}

function formatAssistantText(text) {
  let value = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!value) return "";

  value = stripMarkdownNoise(value);
  value = value.replace(/\n{3,}/g, "\n\n");

  const hasStructuredBlocks =
    /(^|\n)\s*([-*]\s+|\d+\.\s+)/m.test(value) || value.includes("\n\n");

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

function getErrorMessage(error) {
  return error && typeof error.message === "string" ? error.message : "";
}

export { formatAssistantText, getErrorMessage };
