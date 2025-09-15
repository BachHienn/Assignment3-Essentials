import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { MAX_PLAYERS, getPublicRooms, createRoom, findRoom, joinRoom, leaveAllRooms } from "./rooms.js";
import { createUser, verifyUser } from "./auth.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = await createUser({ username, password });
    if (!result.ok) return res.status(400).send(result);
    res.send({ ok: true, username: result.username });
  } catch (err) {
    res.status(500).send({ ok: false, error: "Server error" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = await verifyUser({ username, password });
    if (!result.ok) return res.status(400).send(result);
    res.send({ ok: true, username: result.username });
  } catch (err) {
    res.status(500).send({ ok: false, error: "Server error" });
  }
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

function emitRooms() { io.emit("rooms:list", getPublicRooms()); }

io.on("connection", (socket) => {
  socket.emit("rooms:list", getPublicRooms());

  socket.on("rooms:get", () => {
    socket.emit("rooms:list", getPublicRooms());
  });

  // Return the latest state for a specific room
  socket.on("room:get", ({ roomId } = {}, ack) => {
    const r = roomId ? findRoom(roomId) : null;
    ack?.({ ok: !!r, room: r || null });
  });

  socket.on("room:create", ({ name, displayName }, ack) => {
    const room = createRoom({ name, hostSocketId: socket.id, displayName });
    socket.join(room.id);
    io.to(room.id).emit("room:update", room);
    emitRooms();
    ack?.({ ok: true, roomId: room.id, max: MAX_PLAYERS });
  });

  socket.on("room:join", ({ roomId, displayName }, ack) => {
    const result = joinRoom({ roomId, socketId: socket.id, displayName });
    if (!result.ok) return ack?.({ ok: false, error: result.error });
    socket.join(roomId);
    io.to(roomId).emit("room:update", findRoom(roomId));
    emitRooms();
    ack?.({ ok: true, roomId });
  });

  // ⚠️ Be tolerant to null/undefined payloads from older clients
  socket.on("room:leave", (payload, ack) => {
    const data = (payload && typeof payload === "object") ? payload : {};
    const roomId = data.roomId;

    const affected = leaveAllRooms(socket.id);
    // ensure we also leave the roomId passed (if any) even if it wasn't tracked
    if (roomId && !affected.has?.(roomId)) {
      try { socket.leave(roomId); } catch {}
    }

    for (const id of affected) {
      try { socket.leave(id); } catch {}
      const r = findRoom(id);
      if (r) io.to(id).emit("room:update", r);
    }
    emitRooms();
    ack?.({ ok: true });
  });

  socket.on("disconnect", () => {
    const affected = leaveAllRooms(socket.id);
    for (const id of affected) {
      const r = findRoom(id);
      if (r) io.to(id).emit("room:update", r);
    }
    emitRooms();
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
