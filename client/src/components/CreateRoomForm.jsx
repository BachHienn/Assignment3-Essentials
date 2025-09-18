import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";

export default function CreateRoomForm(){
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const wordCount = label.trim() === "" ? 0 : label.trim().split(/\s+/).length;

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
      <h4 className="muted">Room code will be generated automatically. You can add an optional short description.</h4>
      <div className="space" />
      <textarea
        value={label}
        onChange={e=>{
          const words = e.target.value.trim().split(/\s+/);
          if (words.length <= 30) setLabel(e.target.value);
        }}
        placeholder="Optional description (max 30 words)"
        style={{width: "90%", minHeight: "60px", resize: "vertical", overflowWrap: "break-word", wordWrap: "break-word", whiteSpace: "pre-wrap"}}
      />
       <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{wordCount}/30 words</div>
      <div className="space" />
      <button className="btn primary" onClick={handleCreate} disabled={loading}>{loading?"Creating...":"Create & Join"}</button>
    </div>
  );
}