import { getBotResponse } from "./assistantClient.js";
import { formatAssistantText, getErrorMessage } from "./formatting.js";

const DEFAULT_ASSISTANT_ERROR =
  "Sorry, something went wrong. Please try again later (check the browser console).";

function setInputDisabled(chatInput, sendBtn, isDisabled) {
  chatInput.disabled = isDisabled;
  if (sendBtn) sendBtn.disabled = isDisabled;
}

function appendMessage(chatContainer, message, sender, isTyping = false) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", sender);
  if (isTyping) messageElement.classList.add("typing");
  messageElement.textContent = message;
  chatContainer.appendChild(messageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return messageElement;
}

function appendTypingIndicator(chatContainer) {
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

function getTypewriterDelay(length) {
  if (length > 1400) return 1;
  if (length > 800) return 2;
  if (length > 450) return 4;
  if (length > 250) return 7;
  return 12;
}

async function typewriterToElement(chatContainer, element, text) {
  if (!element) return;
  element.textContent = "";
  const safeText = String(text || "");
  const delayMs = getTypewriterDelay(safeText.length);

  for (let i = 0; i < safeText.length; i += 1) {
    element.textContent += safeText[i];
    chatContainer.scrollTop = chatContainer.scrollHeight;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

function enableCursorGlow() {
  const root = document.documentElement;
  let currentX = 50;
  let currentY = 50;
  let targetX = 50;
  let targetY = 50;

  window.addEventListener("mousemove", (event) => {
    targetX = (event.clientX / window.innerWidth) * 100;
    targetY = (event.clientY / window.innerHeight) * 100;
  });

  function animate() {
    currentX += (targetX - currentX) * 0.12;
    currentY += (targetY - currentY) * 0.12;
    root.style.setProperty("--x", `${currentX}%`);
    root.style.setProperty("--y", `${currentY}%`);
    requestAnimationFrame(animate);
  }

  animate();
}

function initChatApp() {
  enableCursorGlow();

  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  const chatContainer = document.getElementById("chat-container");
  const introContent = document.querySelector(".ai-container > .ai-message-content");

  if (!chatForm || !chatInput || !chatContainer) return;

  let hasSentFirstMessage = false;

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    if (!hasSentFirstMessage) {
      hasSentFirstMessage = true;
      if (introContent) introContent.style.display = "none";
    }

    appendMessage(chatContainer, userMessage, "user");
    chatInput.value = "";
    setInputDisabled(chatInput, sendBtn, true);

    const typingEl = appendTypingIndicator(chatContainer);
    try {
      const botMessage = await getBotResponse(userMessage);
      const formatted = formatAssistantText(botMessage || "Sorry, I couldn't generate a response.");
      await typewriterToElement(chatContainer, typingEl, formatted);
      typingEl.classList.remove("typing");
      typingEl.classList.add("typewriter-done");
    } catch (error) {
      const msg = getErrorMessage(error) || DEFAULT_ASSISTANT_ERROR;
      await typewriterToElement(chatContainer, typingEl, formatAssistantText(msg));
      typingEl.classList.remove("typing");
      typingEl.classList.add("typewriter-done");
    } finally {
      setInputDisabled(chatInput, sendBtn, false);
      chatInput.focus();
    }
  });
}

export { initChatApp };
