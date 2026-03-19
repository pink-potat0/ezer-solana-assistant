const path = require("path");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const START_PORT = Number(process.env.PORT) || 3000;

app.get("/env.js", (_req, res) => {
  const publicConfig = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    CMC_API_KEY: process.env.CMC_API_KEY || "",
  };

  res.setHeader("Content-Type", "application/javascript");
  res.send(`window.APP_CONFIG = ${JSON.stringify(publicConfig)};`);
});

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
