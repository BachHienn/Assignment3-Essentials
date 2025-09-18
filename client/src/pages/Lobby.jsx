// src/pages/Lobby.jsx
import React, { useEffect, useState } from "react";
import { socket } from "../socket";
import CreateRoomForm from "../components/CreateRoomForm.jsx";
import RoomList from "../components/RoomList.jsx";

export default function Lobby() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const onList = (payload) => setRooms(payload || []);
    socket.on("rooms:list", onList);
    socket.emit("rooms:get");
    return () => socket.off("rooms:list", onList);
  }, []);

  return (
    <div className="lobby">
      <div className="lobby-bg" aria-hidden />
      <div className="lobby-grid">
        <section className="panel-card">
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>🎮 Create a Room</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Generate a room code and invite friends. Add an optional description.
          </p>
          <CreateRoomForm />
        </section>

        <section className="panel-card">
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <h2 style={{ margin: 0 }}>👥 Active Rooms</h2>
            <span className="pill" style={{ whiteSpace: "nowrap" }}>
              {rooms.length} {rooms.length === 1 ? "room" : "rooms"}
            </span>
          </div>
          <RoomList rooms={rooms} />
        </section>
      </div>
    </div>
  );
}
