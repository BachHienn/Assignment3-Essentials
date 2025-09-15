import React from "react";
import { useNavigate } from "react-router-dom";

export default function Home(){
  const navigate = useNavigate();

  function goLobby(){
    const user = localStorage.getItem("ttg_user");
    if (!user) {
      alert("You must be logged in to access the lobby");
      navigate("/login", { state: { from: "/lobby", note: "Please log in to access the multiplayer lobby." } });
    } else {
      navigate("/lobby");
    }
  }

  return (
    <div className="grid">
      <div className="card">
        <h3>Singleplayer</h3>
        <p className="muted">Practice mode (placeholder). We'll add questions later.</p>
        <div className="space" />
        <button className="btn" disabled>Coming soon</button>
      </div>
      <div className="card">
        <h3>Multiplayer</h3>
        <p className="muted">Create or join rooms (login required).</p>
        <div className="space" />
        <button className="btn primary" onClick={goLobby}>Go to Lobby</button>
      </div>
    </div>
  );
}