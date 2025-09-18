import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setStatus(null);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus({ ok: false, msg: data.error || "Registration failed" });
      } else {
        navigate("/login", { replace: true, state: { justRegistered: data.username } });
      }
    } catch {
      setStatus({ ok: false, msg: "Network error" });
    }
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Sparkle Background */}
      <div className="sparkle-bg">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Centered card */}
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          className="card slide-up"
          style={{
            width: "100%",
            maxWidth: 420,
            textAlign: "center",
            padding: "32px 28px",
            borderRadius: 16,
            background: "#fff",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          <h2 style={{ marginBottom: 8 }}>📝 Create Account</h2>
          <p className="muted" style={{ marginBottom: 20 }}>
            Join the fun! Just pick a username and password.
          </p>
          <form onSubmit={submit} style={{ textAlign: "left" }}>
            <label>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              style={{ width: "100%", marginBottom: 16 }}
              autoComplete="username"
            />
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: "100%", marginBottom: 20 }}
              autoComplete="new-password"
            />
            <button className="btn primary lg cta" type="submit" style={{ width: "100%" }}>
              Create Account
            </button>
          </form>
          {status && (
            <div
              className="muted"
              style={{ marginTop: 12, color: status.ok ? "green" : "tomato" }}
            >
              {status.msg}
            </div>
          )}
          <div style={{ marginTop: 16, fontSize: 14 }}>
            Already have an account?{" "}
            <a href="#" onClick={() => navigate("/login")} style={{ color: "var(--primary)", fontWeight: 600 }}>
              Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}