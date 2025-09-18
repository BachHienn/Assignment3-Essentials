import React, { useState, useEffect } from "react";
import { socket } from "../socket";

export default function Lobby() {
  const [rooms, setRooms] = useState([]);
  const [desc, setDesc] = useState("");

  useEffect(() => {
    socket.emit("room:list", {}, (res) => {
      setRooms(res?.rooms || []);
    });

    socket.on("room:update", (res) => {
      setRooms(res?.rooms || []);
    });

    return () => {
      socket.off("room:update");
    };
  }, []);

  function createRoom(e) {
    e.preventDefault();
    socket.emit("room:create", { desc }, (res) => {
      if (res?.ok) {
        localStorage.setItem("ttg_current_room", res.room.id);
        window.location.href = `/room/${res.room.id}`;
      }
    });
  }

  return (
    <div
      style={{
        minHeight: "58vh",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 20px",
        gap: 30,
      }}
    >
      {/* Create Room */}
      <div
        className="card slide-up"
        style={{ flex: 1, maxWidth: 500, padding: 30 }}
      >
        <h2>🎮 Create a Room</h2>
        <p className="muted">
          Room code will be generated automatically.  
          Add a short description (optional).
        </p>
        <form onSubmit={createRoom} style={{ marginTop: 20 }}>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            maxLength={150}
            placeholder="Optional description (max 30 words)"
            style={{
              width: "100%",
              minHeight: 80,
              borderRadius: 8,
              padding: 10,
              border: "1px solid #ddd",
              marginBottom: 16,
              resize: "none",
            }}
          />
          <button
            type="submit"
            className="btn primary lg cta"
            style={{
              width: "100%",
              fontSize: "1.1rem",
              padding: "12px 20px",
            }}
          >
            🚀 Create & Join
          </button>
        </form>
      </div>

      {/* Active Rooms */}
      <div
        className="card slide-up"
        style={{ flex: 1, maxWidth: 600, padding: 30 }}
      >
        <h2>👥 Active Rooms</h2>
        {rooms.length === 0 ? (
          <p className="muted" style={{ marginTop: 20 }}>
            🚪 No rooms yet. Be the first to create one!
          </p>
        ) : (
          <div
            style={{
              marginTop: 20,
              maxHeight: 400,
              overflowY: "auto",
              display: "grid",
              gap: 12,
            }}
          >
            {rooms.map((room) => (
              <div
                key={room.id}
                className="pill"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "#f9f9f9",
                  border: "1px solid #eee",
                  borderRadius: 10,
                }}
              >
                <span>
                  <strong>{room.id}</strong> — {room.desc || "No description"}
                </span>
                <button
                  className="btn"
                  onClick={() => {
                    localStorage.setItem("ttg_current_room", room.id);
                    window.location.href = `/room/${room.id}`;
                  }}
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
