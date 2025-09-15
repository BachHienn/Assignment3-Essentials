const MAX_PLAYERS = 10;
const rooms = new Map();

function genId(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function getPublicRooms() {
  return Array.from(rooms.values()).map(r => ({
    id: r.id,
    name: r.name,
    players: r.players.map(p => ({ id: p.id, name: p.name })),
    max: r.max
  }));
}

function createRoom({ name, hostSocketId, displayName }) {
  const id = genId();
  const room = {
    id,
    name: name?.trim() || `Room-${id}`,
    players: [{ id: hostSocketId, name: displayName?.trim() || `Player-${id}` }],
    max: MAX_PLAYERS,
    hostId: hostSocketId
  };
  rooms.set(id, room);
  return room;
}

function findRoom(roomId) {
  return rooms.get(roomId);
}

function joinRoom({ roomId, socketId, displayName }) {
  const room = rooms.get(roomId);
  if (!room) return { ok: false, error: "Room not found" };
  if (room.players.some(p => p.id === socketId)) return { ok: true, room };
  if (room.players.length >= room.max) return { ok: false, error: "Room is full" };
  room.players.push({ id: socketId, name: displayName?.trim() || `Player-${socketId.slice(0, 10)}` });
  return { ok: true, room };
}

function leaveAllRooms(socketId) {
  const affected = new Set();
  for (const [id, room] of rooms.entries()) {
    const idx = room.players.findIndex(p => p.id === socketId);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      if (room.hostId === socketId && room.players[0]) room.hostId = room.players[0].id;
      if (room.players.length === 0) {
        rooms.delete(id);
      } else {
        affected.add(id);
      }
    }
  }
  return affected;
}

export { MAX_PLAYERS, rooms, getPublicRooms, createRoom, findRoom, joinRoom, leaveAllRooms };