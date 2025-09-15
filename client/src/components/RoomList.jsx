import React from "react";
import { Link } from "react-router-dom";

export default function RoomList({ rooms = [] }){
  function flashCard(id){
    const el = document.getElementById(`room-${id}`);
    if (el){
      el.style.background = "#ffe6e6";
      el.style.borderColor = "#ff8a8a";
      setTimeout(() => {
        el.style.background = "white";
        el.style.borderColor = "#eee";
      }, 600);
    }
  }

  return (
    <div className="card">
      <h4>Active Rooms</h4>
      {rooms.length === 0 && (<p className="muted">No rooms yet. Create one!</p>)}
      <div className="grid">
        {rooms.map(room => (
          <div key={room.id} id={`room-${room.id}`} className="card" style={{ transition: "background 200ms, border-color 200ms" }}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <strong>Code: {room.id}</strong>
              <span className="pill">{room.players.length}/{room.max}</span>
            </div>
            <div
              className="muted"
              style={{
                fontSize: 14,
                padding: "10px 0px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {room.name}
            </div>
            <div className="space" />
            <div className="muted" style={{fontSize:14, padding:"10px 0px"}}>Players: {room.players.map(p=>p.name).join(", ") || "—"}</div>
            <div className="space" />
            <Link to={`/room/${room.id}`} className="btn" aria-disabled={room.players.length >= room.max} onClick={(e)=>{
              if (room.players.length >= room.max) {
                e.preventDefault();
                alert("Room is full (max 10)");
                flashCard(room.id);
              }
            }}>Join</Link>
          </div>
        ))}
      </div>
    </div>
  );
}