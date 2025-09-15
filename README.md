# Trivia Task Game — Starter (Socket.IO + React)

This is the ready-to-run starter with Homepage, Lobby (create/join rooms, 4-player cap), Room view, and a simple **Create Account** (register) API that stores **hashed** passwords.

## Stack
- Server: Node.js, Express, Socket.IO, bcryptjs
- Client: Vite + React + react-router, socket.io-client

## Run locally
### Server
```bash
cd server
npm i
npm run dev
# -> http://localhost:3001
```
- On first run, `server/data/users.json` will be created automatically.

### Client
```bash
cd client
npm i
# optional: set env vars
# echo "VITE_SOCKET_URL=http://localhost:3001" > .env
# echo "VITE_API_URL=http://localhost:3001" >> .env
npm run dev
# -> open the shown URL (usually http://localhost:5173)
```

## Routes
- Client pages: `/` (Home), `/lobby`, `/room/:roomId`, `/register`
- API: `POST /auth/register` `{ username, password }`

## Notes
- This starter keeps rooms in memory. For production, use a DB or Redis.
- Registration is demo-only (no login yet). Add JWT/sessions later if needed.
