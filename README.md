# Ezer Solana Assistant

This project is a lightweight chat interface focused on Solana and crypto education.

## Architecture

- `index.html` + `chat.css`: static UI shell.
- `script.js`: browser entrypoint.
- `js/chatApp.js`: DOM wiring and interaction flow.
- `js/assistantClient.js`: conversation orchestration and API calls.
- `js/context.js`: optional fresh context fetchers for current-events prompts.
- `js/marketData.js`: live price intent parsing and market quote responses.
- `server.js`: local Express server for static assets + `/api/chat`.
- `api/chat.js`: Vercel serverless endpoint using same handler contract.
- `lib/chatRoute.js`: shared backend logic (validation + OpenAI proxy).

## Runtime behavior

1. User sends a message in the browser.
2. Frontend chooses price flow or assistant flow.
3. Assistant flow calls `/api/chat` with validated role/content messages.
4. Backend calls OpenAI with `OPENAI_API_KEY` from environment variables.
5. Frontend renders the returned response with typing animation.

## Environment

Create `.env` for local development:

```
OPENAI_API_KEY=your_key
PORT=3000
```

On Vercel, set `OPENAI_API_KEY` in project environment settings.

