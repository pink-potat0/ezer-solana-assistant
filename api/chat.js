const { handleChatRequest } = require("../lib/chatRoute");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Method not allowed" } });
    return;
  }

  await handleChatRequest(req, res);
};
