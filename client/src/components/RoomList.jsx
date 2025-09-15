import React from "react";
import { Link } from "react-router-dom";

export default function RoomList({ rooms = [] }){
  return (
    <div className="card">
      <h4>Active Rooms</h4>
      {rooms.length === 0 && (<p className="muted">No rooms yet. Create one!</p>)}
      <div className="grid">
        {rooms.map(room => (
          <div key={room.id} className="card">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <strong>{room.name}</strong>
              <span className="pill">{room.players.length}/{room.max}</span>
            </div>
            <div className="space" />
            <div className="muted" style={{fontSize:14, padding:"10px 0px"}}>Players: {room.players.map(p=>p.name).join(", ") || "—"}</div>
            <div className="space" />
            <Link to={`/room/${room.id}`} className="btn" aria-disabled={room.players.length >= room.max} onClick={(e)=>{
              if (room.players.length >= room.max) {
                e.preventDefault();
                alert("Room is full (max 4)");
              }
            }}>Join</Link>
          </div>
        ))}
      </div>
    </div>
  );
}