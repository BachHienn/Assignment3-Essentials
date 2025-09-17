import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { MAX_PLAYERS, getPublicRooms, createRoom, findRoom, joinRoom, leaveAllRooms } from "./rooms.js";
import { createUser, verifyUser, verifyGoogleIdToken, createOrFindGoogleUser } from "./auth.js";
import * as game from "./game.js";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// auth endpoints
app.post("/auth/register", async (req, res) => { try { const { username, password } = req.body || {}; const result = await createUser({ username, password }); if (!result.ok) return res.status(400).send(result); res.send({ ok: true, username: result.username }); } catch { res.status(500).send({ ok:false, error:"Server error" }); } });
app.post("/auth/login", async (req, res) => { try { const { username, password } = req.body || {}; const result = await verifyUser({ username, password }); if (!result.ok) return res.status(400).send(result); res.send({ ok: true, username: result.username }); } catch { res.status(500).send({ ok:false, error:"Server error" }); } });
app.post("/auth/google", async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential) return res.status(400).send({ ok:false, error:"Missing credential" });
    const payload = await verifyGoogleIdToken(credential);
    const { sub: googleId, email, name } = payload || {};
    if (!googleId) return res.status(400).send({ ok:false, error:"Invalid Google token" });
    const result = await createOrFindGoogleUser({ googleId, email, name });
    res.send({ ok:true, username: result.username, created: !!result.created });
  } catch (e) {
    res.status(400).send({ ok:false, error: "Google sign-in failed" });
  }
});

app.get("/questions", async (req, res) => {
  try {
    const file = path.join(__dirname, "data", "questions.json");
    const text = await fs.readFile(file, "utf-8");
    const arr = JSON.parse(text);
    if (!Array.isArray(arr) || arr.length === 0) return res.status(404).send({ ok:false, error:"No questions found" });
    res.send({ ok:true, questions: arr });
  } catch (e) {
    res.status(500).send({ ok:false, error:"Failed to load questions" });
  }
});



const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const LOBBY_COUNTDOWN = 5; // seconds before start when everyone ready
const QUESTION_COUNTDOWN = 10 // seconds per question
const NEXT_DELAY_MS = 500; // 0.5s reveal pause between questions

const lobbyCountdowns = new Map(); // roomId -> { timer }
const questionTimers  = new Map(); // roomId -> { timer, secs }

function emitRooms(){
  // Hide rooms whose game already started
  const list = getPublicRooms().filter(r => !(game.get(r.id)?.started));
  io.emit("rooms:list", list);
}
function emitGame(roomId){ io.to(roomId).emit("game:state", game.get(roomId)); }

function cancelLobbyCountdown(roomId){
  const c = lobbyCountdowns.get(roomId);
  if (c){ clearInterval(c.timer); lobbyCountdowns.delete(roomId); io.to(roomId).emit("game:countdown", null); }
}
function canStart(roomId){ const st = game.get(roomId); return !!(st && st.canStart); }

function beginLobbyCountdown(roomId){
  if (lobbyCountdowns.has(roomId)) return;
  let secs = LOBBY_COUNTDOWN;
  io.to(roomId).emit("game:countdown", secs);
  const t = setInterval(() => {
    if (!canStart(roomId)) { cancelLobbyCountdown(roomId); return; }
    secs -= 1;
    if (secs > 0){ io.to(roomId).emit("game:countdown", secs); return; }
    cancelLobbyCountdown(roomId);
    const r = findRoom(roomId); if (!r) return;
    const roster = r.players.map(p => ({ id:p.id, name:p.name }));
    game.start(roomId, roster);
    emitGame(roomId);
    emitRooms(); // hide from lobby once started
    startQuestionTimer(roomId);
  }, 1000);
  lobbyCountdowns.set(roomId, { timer: t });
}

function cancelQuestionTimer(roomId){
  const q = questionTimers.get(roomId);
  if (q){ clearInterval(q.timer); questionTimers.delete(roomId); io.to(roomId).emit("game:qcountdown", null); }
}
function startQuestionTimer(roomId){
  cancelQuestionTimer(roomId);
  let secs = QUESTION_COUNTDOWN;
  questionTimers.set(roomId, { timer: null, secs });
  io.to(roomId).emit("game:qcountdown", secs);
  const t = setInterval(() => {
    const st = game.get(roomId);
    if (!st || !st.started || st.finished){ cancelQuestionTimer(roomId); return; }
    secs -= 1;
    questionTimers.set(roomId, { timer: t, secs });
    if (secs > 0){ io.to(roomId).emit("game:qcountdown", secs); return; }
    scheduleNext(roomId); // time up → 0.5s reveal then next
  }, 1000);
  questionTimers.set(roomId, { timer: t, secs });
}
function getQuestionSecs(roomId){ return questionTimers.get(roomId)?.secs ?? 0; }

function scheduleNext(roomId){
  game.lock(roomId, true); // stop answers during reveal
  cancelQuestionTimer(roomId);
  setTimeout(() => {
    const st = game.get(roomId);
    if (!st || !st.started || st.finished) return;
    game.next(roomId);
    emitGame(roomId);
    const st2 = game.get(roomId);
    if (st2 && st2.started && !st2.finished) startQuestionTimer(roomId);
  }, NEXT_DELAY_MS);
}

// If mid‑game only one player remains, alert them; if none remains, clean up.
function maybeNotifyLastPlayer(roomId){
  const r = findRoom(roomId);
  const st = game.get(roomId);
  if (!r || !st) return;
  if (st.started && !st.finished){
    if (r.players.length === 1){
      const last = r.players[0];
      cancelLobbyCountdown(roomId);
      cancelQuestionTimer(roomId);
      io.to(last.id).emit("room:abandoned", { roomId, reason: "everyone_left" });
    } else if (r.players.length === 0){
      cancelLobbyCountdown(roomId);
      cancelQuestionTimer(roomId);
      game.clearGame(roomId);
    }
  }
}

io.on("connection", (socket) => {
  emitRooms();
  socket.on("rooms:get", () => emitRooms());
  socket.on("room:get", ({ roomId } = {}, ack) => ack?.({ ok: !!roomId && !!findRoom(roomId), room: findRoom(roomId) || null }));

  socket.on("room:create", ({ name, displayName }, ack) => {
    const room = createRoom({ name, hostSocketId: socket.id, displayName });
    socket.join(room.id);
    io.to(room.id).emit("room:update", room);
    game.addPlayer(room.id, { id: socket.id, name: displayName });
    emitGame(room.id);
    emitRooms();
    ack?.({ ok: true, roomId: room.id, max: MAX_PLAYERS });
  });

  socket.on("room:join", ({ roomId, displayName }, ack) => {
    const result = joinRoom({ roomId, socketId: socket.id, displayName });
    if (!result.ok){
      // Flash the room red on the joiner’s lobby (room full etc.)
      ack?.({ ok:false, error: result.error, roomId });
      io.to(socket.id).emit("rooms:flash", { roomId, type: "full" });
      return;
    }
    socket.join(roomId);
    io.to(roomId).emit("room:update", findRoom(roomId));
    game.addPlayer(roomId, { id: socket.id, name: displayName });

    // NEW: lobby guard — if lobby was ready, a join should unready everyone
    const st = game.get(roomId);
    if (st && !st.started){
      game.unreadyAll(roomId);
      cancelLobbyCountdown(roomId);
    }

    emitGame(roomId);
    emitRooms();
    ack?.({ ok:true, roomId });
  });

  socket.on("room:leave", (payload, ack) => {
    const data = (payload && typeof payload === "object") ? payload : {};
    const hint = data.roomId;
    const affected = leaveAllRooms(socket.id);
    if (hint && !affected.has?.(hint)){
      try { socket.leave(hint); } catch {}
      game.removePlayer(hint, socket.id);
      cancelLobbyCountdown(hint);
      if (!findRoom(hint)) { game.clearGame(hint); cancelQuestionTimer(hint); }
      // NEW: lobby guard — leaving also unreadies everyone if lobby state
      const st = game.get(hint);
      if (st && !st.started){ game.unreadyAll(hint); cancelLobbyCountdown(hint); }
      emitGame(hint);
      maybeNotifyLastPlayer(hint);
    }
    for (const id of affected){
      try { socket.leave(id); } catch {}
      const r = findRoom(id);
      if (r) io.to(id).emit("room:update", r);
      game.removePlayer(id, socket.id);
      cancelLobbyCountdown(id);
      if (!findRoom(id)) { game.clearGame(id); cancelQuestionTimer(id); }
      const st2 = game.get(id);
      if (st2 && !st2.started){ game.unreadyAll(id); cancelLobbyCountdown(id); }
      emitGame(id);
      maybeNotifyLastPlayer(id);
    }
    emitRooms();
    ack?.({ ok:true });
  });

  socket.on("disconnect", () => {
    const affected = leaveAllRooms(socket.id);
    for (const id of affected){
      const r = findRoom(id);
      if (r) io.to(id).emit("room:update", r);
      game.removePlayer(id, socket.id);
      cancelLobbyCountdown(id);
      if (!findRoom(id)) { game.clearGame(id); cancelQuestionTimer(id); }
      const st2 = game.get(id);
      if (st2 && !st2.started){ game.unreadyAll(id); cancelLobbyCountdown(id); }
      emitGame(id);
      maybeNotifyLastPlayer(id);
    }
    emitRooms();
  });

  // Readiness + lobby countdown (can un-ready anytime)
  socket.on("game:ready", ({ roomId, ready } = {}, ack) => {
    const r = findRoom(roomId);
    if (!r) return ack?.({ ok:false, error:"Room not found" });
    const me = r.players.find(p => p.id === socket.id) || { id: socket.id, name: "Player" };
    game.setReady(roomId, me, !!ready);
    emitGame(roomId);
    if (canStart(roomId)) beginLobbyCountdown(roomId); else cancelLobbyCountdown(roomId);
    ack?.({ ok:true });
  });

  // Timed Q&A with auto-advance, speed bonus, and 0.5s reveal pause
  socket.on("game:answer", ({ roomId, choiceIndex } = {}, ack) => {
    const r = findRoom(roomId); if (!r) return ack?.({ ok:false, error:"Room not found" });
    const secsLeft = getQuestionSecs(roomId);
    const { correct, allAnswered } = game.answer(roomId, socket.id, choiceIndex, secsLeft);
    emitGame(roomId);
    if (allAnswered) scheduleNext(roomId);
    ack?.({ ok:true, correct }); // immediate UI feedback on client
  });

  // NEW: private results per player after game ends
  socket.on("game:results", ({ roomId } = {}, ack) => {
    const r = findRoom(roomId);
    if (!r) return ack?.({ ok:false, error:"Room not found" });
    const results = game.resultsFor(roomId, socket.id);
    ack?.({ ok:true, results });
  });

  socket.on("game:get", ({ roomId } = {}, ack) => { ack?.({ ok:true, state: game.get(roomId) }); });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
