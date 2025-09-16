import React from "react";

export default function ReadyButton({ meReady, toggleReady, disabled = false }){
  const isReady = !!meReady;
  const bg = isReady ? "#ff4d4d" : "#4CAF50"; // red when "I'm Not Ready", green when "I'm Ready"
  const label = isReady ? "I'm Not Ready" : "I'm Ready";
  return (
    <button
      className="btn"
      onClick={toggleReady}
      disabled={disabled}
      style={{
        backgroundColor: bg,
        color: "white",
        border: "none",
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer"
      }}
      title={disabled ? "Need at least 2 players to start" : undefined}
    >
      {label}
    </button>
  );
}