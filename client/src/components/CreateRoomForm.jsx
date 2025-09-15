import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";

export default function CreateRoomForm(){
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleCreate(){
    const displayName = localStorage.getItem("ttg_user") || "";
    if (!displayName) return alert("You must be logged in");
    setLoading(true);
    // name will be the code of the room, label is just description
    socket.emit("room:create", { name: label, displayName }, (res) => {
      setLoading(false);
      if (!res?.ok) return alert(res?.error || "Failed to create room");
      navigate(`/room/${res.roomId}`);
    });
  }

  return (
    <div className="card">
      <h4>Create a Room</h4>
      <p className="muted">Room code will be generated automatically. You can add an optional short description.</p>
      <div className="space" />
      <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Optional description" style={{width: "90%"}}/>
      <div className="space" />
      <button className="btn primary" onClick={handleCreate} disabled={loading}>{loading?"Creating...":"Create & Join"}</button>
    </div>
  );
}