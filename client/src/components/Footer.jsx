// Footer.jsx
import React from "react";

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: "auto",
        padding: "20px 30px",
        background: "rgba(0,0,0,0.7)",
        color: "#fff",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
          🎮 Trivia Task Game
        </div>
        <div style={{ fontSize: "0.9rem", opacity: 0.85, textAlign: "right" }}>
          © {new Date().getFullYear()} Trivia Task Game
          <br />
          Made with ❤️ for fun & learning
        </div>
      </div>
    </footer>
  );
}
