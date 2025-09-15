import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { socket } from "../socket";
import TriviaGame from "../components/TriviaGame.jsx";

export default function Room(){
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const joinedOnce = useRef(false);

  useEffect(() => {
    if (!localStorage.getItem("ttg_user")) {
      alert("You must be logged in to join rooms");
      navigate("/login", { state: { from: `/room/${roomId}`, note: "Please log in first." } });
      return;
    }
    if (!joinedOnce.current) {
      joinedOnce.current = true;
      const displayName = localStorage.getItem("ttg_user");
      socket.emit("room:join", { roomId, displayName }, (res) => {
        if (!res?.ok) return alert(res?.error || "Failed to join");
        localStorage.setItem("ttg_current_room", roomId);
        socket.emit("room:get", { roomId }, (r) => r?.ok && setRoom(r.room));
      });
    }
  }, [roomId, navigate]);

  useEffect(() => {
    const onUpdate = (r) => { if (r?.id === roomId) setRoom(r); };
    socket.on("room:update", onUpdate);
    return () => socket.off("room:update", onUpdate);
  }, [roomId]);

  function leave(){
    socket.emit("room:get", { roomId }, (res) => {
      const count = res?.room?.players?.length ?? 0;
      if (count <= 1) {
        const ok = confirm("You're the last player. Leaving will delete this room. Leave?");
        if (!ok) return;
      }
      socket.emit("room:leave", { roomId }, () => {
        localStorage.removeItem("ttg_current_room");
        navigate("/lobby");
      });
    });
  }

  const isHost = room && room.hostId === socket.id;

  return (
    <div className="card">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h3>Room: {roomId}</h3>
        <button className="btn" style={{backgroundColor:"red", color:"white"}} onClick={leave}>Leave Room</button>
      </div>

      <p className="muted">Players in room:</p>
      <ul>
        {(room?.players || []).map(p => <li key={p.id}>• {p.name}{p.id===room?.hostId?" (host)":""}</li>)}
      </ul>

      <div className="space" />
      <TriviaGame roomId={roomId} isHost={!!isHost} />
    </div>
  );
}