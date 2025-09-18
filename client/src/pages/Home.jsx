import React from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";

export default function Home() {
  const navigate = useNavigate();

  function fireConfetti() {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#FF7A59", "#FFC857", "#7AD9A7", "#7AB8FF"], // match theme
    });
  }

  function goLobby() {
    const user = localStorage.getItem("ttg_user");
    if (!user) {
      alert("You must be logged in to access the lobby");
      navigate("/login", {
        state: {
          from: "/lobby",
          note: "Please log in to access the multiplayer lobby.",
        },
      });
    } else {
      fireConfetti();
      setTimeout(() => navigate("/lobby"), 500);
    }
  }

  function goSingle() {
    fireConfetti();
    setTimeout(() => navigate("/single"), 500);
  }

  return (
    <div style={{ textAlign: "center" }}>
      {/* Hero Section */}
      <div
        className="card pop"
        style={{
          padding: "40px 20px",
          marginBottom: 30,
          background:
            "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
          color: "#fff",
        }}
      >
        <h1 style={{ fontSize: "2.5rem", marginBottom: 10 }}>
          🎉 Welcome to Trivia Task Game
        </h1>
        <p className="muted" style={{ color: "#fff", fontSize: 18 }}>
          Challenge yourself or compete with friends — test your knowledge in a
          fun way!
        </p>
      </div>
        
      {/* Game Modes */}
      <div
        className="grid slide-up"
        style={{ gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 30 }}
      >
        {/* Singleplayer */}
        <div className="card" style={{ padding: "24px", textAlign: "center" }}>
          <h2>🎯 Singleplayer</h2>
          <p className="muted">
            Practice mode to sharpen your skills at your own pace.
          </p>
          <div className="space" />
          <button className="btn primary lg cta" onClick={goSingle}>
            Play Solo
          </button>
        </div>

        {/* Multiplayer */}
        <div className="card" style={{ padding: "24px", textAlign: "center" }}>
          <h2>👥 Multiplayer</h2>
          <p className="muted">
            Create or join rooms and battle your friends in real time.
          </p>
          <div className="space" />
          <button className="btn primary lg cta" onClick={goLobby}>
            Join Lobby
          </button>
        </div>
      </div>

      {/* Leaderboard Preview */}
      <div className="card slide-up" style={{ marginTop: 50 }}>
        <h3>🏆 Top Players</h3>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="pill success">Alice — 320 pts</div>
          <div className="pill">Bob — 290 pts</div>
          <div className="pill">Charlie — 270 pts</div>
          <div className="pill">Diana — 250 pts</div>
        </div>
      </div>

      {/* How to Play Section */}
      <div className="card pop" style={{ marginTop: 50 }}>
        <h3>✨ How to Play</h3>
        <div
          className="grid"
          style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 20 }}
        >
          <div>
            <h2>🎯</h2>
            <p>Choose Single or Multiplayer</p>
          </div>
          <div>
            <h2>⏱</h2>
            <p>Answer quickly before the timer runs out</p>
          </div>
          <div>
            <h2>🏆</h2>
            <p>Score points and climb the leaderboard</p>
          </div>
        </div>
      </div>

      {/* Announcements */}
      <div className="card slide-up" style={{ marginTop: 50 }}>
        <h3>📢 Announcements</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li style={{ marginBottom: 8 }}>
            🎉 New quiz topics coming soon!
          </li>
          <li style={{ marginBottom: 8 }}>
            🏆 Weekend tournament on AI Ethics
          </li>
          <li>🚀 Multiplayer improvements in the next update</li>
        </ul>
      </div>

      {/* Animated Mascot / Floating Icons */}
      <div
        style={{
          marginTop: 60,
          fontSize: 48,
          animation: "float 3s ease-in-out infinite",
        }}
      >
      </div>
    </div>
  );
}
