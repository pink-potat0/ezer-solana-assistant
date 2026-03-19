const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const { handleChatRequest } = require("./lib/chatRoute");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const START_PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "1mb" }));

app.post("/api/chat", handleChatRequest);

app.use(express.static(path.join(__dirname)));

function startServer(port, retriesLeft = 10) {
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE" && retriesLeft > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is busy, trying ${nextPort}...`);
      startServer(nextPort, retriesLeft - 1);
      return;
    }

    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

startServer(START_PORT);
