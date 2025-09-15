import React from "react";

export default function ReadyButton({ meReady, toggleReady }){
  return (
    <button
      className="btn"
      onClick={toggleReady}
      style={{
        backgroundColor: meReady ? "#ff4d4d" : "#4CAF50",
        color: "white",
        border: "none"
      }}
    >
      {meReady ? "I'm Not Ready" : "I'm Ready"}
    </button>
  );
}