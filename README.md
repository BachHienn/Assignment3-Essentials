# Vibe Coding Trivia — Creative Project

A collaborative, real‑time trivia game that showcases **Vibe Coding** principles: creativity, pairing, flow, and playful iteration. Includes **single‑player** and **multiplayer** modes, a neutral cream/beige UI, ready checks, timed questions, and per‑player results.

---

## Table of Contents
- [Overview](#overview)
- [Why this project (Vibe Coding)](#why-this-project-vibe-coding)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prereqs](#prereqs)
  - [Local setup](#local-setup)
  - [Environment variables](#environment-variables)
- [Running the App](#running-the-app)
- [Gameplay](#gameplay)
  - [Rooms & Lobby](#rooms--lobby)
  - [Game Flow](#game-flow)
  - [Scoring](#scoring)
- [Data & Persistence](#data--persistence)
- [API & Events](#api--events)
  - [REST](#rest)
  - [Socket Events](#socket-events)
- [Design & UX](#design--ux)
- [Documentation for Assessment](#documentation-for-assessment)
  - [Project Overview](#project-overview)
  - [Goals & Achievements](#goals--achievements)
  - [Group Roles & Contributions](#group-roles--contributions)
  - [Development Instructions](#development-instructions)
  - [Ethics & AI Use](#ethics--ai-use)
- [Testing Checklist](#testing-checklist)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview
**Vibe Coding Trivia** is a web app where players race to answer questions under time pressure. It supports:
- **Single‑player:** fast local play; 15 shuffled questions per round.
- **Multiplayer:** rooms (default max **4** players, configurable), live lobby, ready checks, countdowns, synchronized timers and answers, instant correctness feedback, and a final scoreboard + per‑player review.

## Why this project (Vibe Coding)
- Encourages **creative collaboration** (pairing, short feedback loops) while building a playful experience.
- Demonstrates **flow**: quick iterations, minimal friction to start a round, visible progress (countdowns, score), and lightweight docs.
- Emphasizes **clarity & atmosphere**: warm neutral theme, clean components, and clear affordances (ready, leave, skip).

## Features
- 🔐 **Auth**: simple username/password (bcrypt-hashed) with header state + logout.
- 🧑‍🤝‍🧑 **Multiplayer**: rooms list, capacity guard, duplicate‑join protection, ready/unready, auto‑unready on join/leave, 3‑second pre‑start countdown, per‑question timers, live scoreboard.
- 🧠 **Single‑player**: 15 shuffled questions, difficulty colors, 3‑second pre‑start, timed scoring, end‑of‑game answer review.
- 🎯 **Correctness + Shuffle**: answers are shuffled; correctness maps via display→original index.
- 🏃 **Speed Bonus**: base 10 points for correct; additional bonus only for the **first 5 seconds** of a 10s question (multiplayer) or per‑mode timing in single‑player.
- 🧹 **Resilience**: disconnect/leave cleanup, room abandonment handling, hidden active rooms when a game is in progress, responsive UI.

## Architecture
```
repo/
  client/               # Vite React app
    src/
      components/       # UI components (Lobby, RoomList, TriviaGame, etc.)
      pages/            # Routes (Home, Login, Register, SinglePlayer, Lobby, Room)
      socket.js         # socket.io client instance
      styles.css        # cream/beige responsive theme
  server/               # Express + Socket.IO API/server
    data/
      users.json        # hashed users (local demo store)
      questions.json    # question bank [{ text, choices[4], answerIndex }]
    auth.js             # createUser / verifyUser (bcrypt)
    rooms.js            # room registry, join/leave, max capacity
    game.js             # trivia engine (state machine + scoring + results)
    index.js            # express routes + socket event wiring
```

## Tech Stack
- **Frontend:** React (Vite), vanilla CSS (cream/beige theme), Socket.IO client
- **Backend:** Node.js, Express, Socket.IO, bcryptjs, fs persistence

## Getting Started
### Prereqs
- Node.js 18+

### Local setup
```bash
# 1) Install
cd server && npm i
cd ../client && npm i

# 2) Start server (port 3001 by default)
cd server
npm run dev

# 3) Start client (Vite, default 5173)
cd ../client
npm run dev
```
Open http://localhost:5173

### Environment variables
Use **two** `.env` files:
```
client/.env
VITE_API_URL=http://localhost:3001
# VITE_GOOGLE_CLIENT_ID=<optional if you add Google login>

server/.env
PORT=3001
# GOOGLE_CLIENT_ID=<optional if you add Google login server-side>
```

> You can also use a single root .env if you point Vite’s `envDir` to `..` and configure `dotenv` in the server—but two files is simpler.

## Running the App
- **Register** a demo account (username/password). Passwords are hashed.
- **Login** to see header reflect “Hi, username”.
- **Multiplayer** → Lobby → Create Room → (optional description) → others join → everyone Ready → 3s countdown → game.
- **Single‑player** → pick difficulty → 3s countdown → 15 questions.

## Gameplay
### Rooms & Lobby
- Room list shows *code*, *players count*, and *players names*.
- Full room: client flashes red + blocks join.
- Already joined: blocks duplicate join with an alert.
- Hidden rooms: a room in an active game is hidden from the public list until the game ends.

### Game Flow
- Lobby: all players **Ready**; if someone joins/leaves, everyone auto‑**unready**.
- Pre‑start countdown: **3 seconds**.
- Per‑question countdown: **5–10s** depending on mode/config (default MP: 5s; SP: per difficulty).
- Answers reveal instantly with **green/red** feedback; next question auto‑advances after **0.5s**.
- End: scoreboard + **per‑player answers review** (your choice highlighted; correct answer tagged).

### Scoring
- **Correct**: +10 points.
- **Speed bonus (MP)**: only during the **first 5s** of a 10s timer (2 pts/sec). (Configurable in `server/game.js`.)
- **Single‑player**: similar logic; bonus aligned with per‑mode timers.

## Data & Persistence
- **Users** stored in `server/data/users.json` with `bcrypt` hashes.
- **Questions** stored in `server/data/questions.json` as:
```json
{
  "text": "What does 'Vibe Coding' emphasize most?",
  "choices": ["Pure algorithmic speed", "Creativity & collaboration", "Only strict style guides", "Hardware tuning"],
  "answerIndex": 1
}
```
- You can add more questions—ensure valid indices and 4 choices.

## API & Events
### REST
- `POST /auth/register`  → `{ username, password }` → `{ ok, username | error }`
- `POST /auth/login`     → `{ username, password }` → `{ ok, username | error }`
- `GET  /questions`      → returns question bank (used by single‑player)

### Socket Events
**Rooms**
- `rooms:get` → server emits `rooms:list` with array of public rooms
- `room:create` → `{ name, displayName }` → creates room (name=code/description)
- `room:join`   → `{ roomId, displayName }` → joins (capacity checked)
- `room:leave`  → leave current room(s), server emits updates

**Lobby/Game**
- `game:get` → returns current sanitized game state
- `game:ready` → `{ roomId, ready }` toggle
- `game:countdown` → pre‑start seconds broadcast
- `game:qcountdown` → per‑question seconds broadcast
- `game:state` → room‑scoped updates (question, idx, scores, ready, etc.)
- `game:answer` → `{ roomId, choiceIndex }` → `{ ok, correct, allAnswered }`
- `game:results` → per‑player answer history for final review
- `room:abandoned` → notifies last player if others leave mid‑game

## Design & UX
- **Theme:** warm cream/beige with subtle elevation; responsive breakpoints for 1024px/768px/420px.
- **Affordances:** clear primary/danger buttons, pill timers, ellipsized room names, success/warn/danger pills.
- **Feedback:** alerts for capacity/duplicate join, flashing room card on error, green/red answer feedback.

## Documentation for Assessment
### Project Overview
We built a web‑based trivia game to explore **Vibe Coding**—cultivating a fun, human‑centered dev atmosphere. The app balances creativity (UI, themes, playful flows) with collaboration (multiplayer real‑time state) and pragmatic engineering (clean modules, clear events).

### Goals & Achievements
- **Goal:** deliver a multiplayer trivia with robust UX → **Achieved**: rooms, ready checks, countdowns, timers, synchronized scoring, per‑player results.
- **Goal:** single‑player mode for rapid iteration → **Achieved**.
- **Goal:** demonstrate Vibe Coding: pairing, short feedback loops, ethical AI use → **Achieved** with iterative commits and documented AI usage.

### Group Roles & Contributions
Use this template (fill with your names):

| Role | Owner | Highlights |
|------|-------|-----------|
| Product/PM | _Name_ | Scope, backlog, demos |
| Backend | _Name_ | Express routes, Socket.IO, game engine, scoring |
| Frontend | _Name_ | React components, state, responsive CSS |
| UX/Visual | _Name_ | Theme system, interactions, accessibility |
| QA/Docs | _Name_ | Test plans, README, rubric mapping |

> Each PR should include a short note on who paired/reviewed and why decisions were made.

### Development Instructions
- See [Getting Started](#getting-started). Make sure `.env` is set up on both client and server.
- For **Google login**, register OAuth credentials and add `VITE_GOOGLE_CLIENT_ID` (client) and `GOOGLE_CLIENT_ID` (server) if you enable that feature.
- For production, host the server (Render/Fly/Heroku) and the client (Vercel/Netlify) and set `VITE_API_URL` to the live server URL.

### Ethics & AI Use
- We used AI for brainstorming, scaffolding, and refactors; we **reviewed and tested** all generated code.
- In the README and presentation we **disclose** AI assistance and take **accountability** for correctness and security.
- Question content is academic/demo; avoid copyrighted material when expanding the question bank.

## Testing Checklist
- [ ] Register/login/logout flow
- [ ] Header reflects auth state across navigation
- [ ] Create room → join/leave → capacity/full alerts
- [ ] Duplicate join guarded
- [ ] Ready/unready + auto‑unready on join/leave
- [ ] 3s pre‑start countdown
- [ ] Per‑question countdown + 0.5s reveal, auto‑advance
- [ ] Score updates with speed bonus (first 5s only)
- [ ] Mid‑game disconnect → others continue; last player alerted & returned
- [ ] Final scoreboard + per‑player answer review
- [ ] Single‑player: 15 questions, shuffles each run
- [ ] Responsive layout on mobile/tablet

## Roadmap
- ✅ Per‑player results & review
- ✅ Hidden rooms during active games
- ⏳ Google login (optional)
- ⏳ Admin: question editor UI
- ⏳ Spectator mode
- ⏳ Persistent rooms & match history (DB)

## License
MIT (or your preferred license). Include a `LICENSE` file in the repo root.

---

### Screenshots (optional)
Add screenshots/gifs of the lobby, room, gameplay, and results sections here.

