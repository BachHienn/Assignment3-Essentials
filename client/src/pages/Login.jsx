import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID; // re-added

  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = location.state?.justRegistered; // re-added

  async function submit(e) {
    e.preventDefault();
    setStatus(null);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus({ ok: false, msg: data.error || "Login failed" });
      } else {
        localStorage.setItem("ttg_user", data.username);
        window.dispatchEvent(new Event("ttg:user"));
        alert(`Welcome, ${data.username}!`); // re-added
        navigate("/", { replace: true });   // re-added original behavior
      }
    } catch {
      setStatus({ ok: false, msg: "Network error" });
    }
  }

  // Google Identity Services (re-added)
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const res = await fetch(`${API_URL}/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: response.credential }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || "Google login failed");
            localStorage.setItem("ttg_user", data.username);
            window.dispatchEvent(new Event("ttg:user"));
            alert(`Welcome, ${data.username}!`);
            navigate("/", { replace: true });
          } catch (err) {
            setStatus({ ok: false, msg: err.message || "Google login failed" });
          }
        },
      });
      const el = document.getElementById("gsi-btn");
      if (el) {
        window.google?.accounts.id.renderButton(el, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
        });
      }
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [GOOGLE_CLIENT_ID, API_URL, navigate]);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Sparkle Background (kept) */}
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

      {/* Auth Card */}
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
            maxWidth: 400,
            textAlign: "center",
            padding: "32px 28px",
            borderRadius: 16,
            background: "#fff",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          }}
        >
          <h2 style={{ marginBottom: 8 }}>🔑 Login</h2>

          {/* justRegistered banner (re-added) */}
          {justRegistered && (
            <div className="muted" style={{ marginBottom: 12 }}>
              Account <strong>{justRegistered}</strong> created. Please log in.
            </div>
          )}

          <p className="muted" style={{ marginBottom: 20 }}>
            Welcome back! Please log in to continue.
          </p>

          <form onSubmit={submit} style={{ textAlign: "left" }}>
            <label>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
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
              autoComplete="current-password"
            />
            <button
              className="btn primary lg cta"
              type="submit"
              style={{ width: "100%" }}
            >
              Login
            </button>
          </form>

          {/* Divider (re-added) */}
          <div className="space" />
          <div
            className="muted"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span style={{ flex: 1, height: 1, background: "#eee" }} />
            <span>or</span>
            <span style={{ flex: 1, height: 1, background: "#eee" }} />
          </div>
          <div className="space" />

          {/* Google button mount (re-added) */}
          <div id="gsi-btn" style={{ display: GOOGLE_CLIENT_ID ? "block" : "none" }} />
          {!GOOGLE_CLIENT_ID && (
            <div className="muted" style={{ color: "tomato", fontSize: 12 }}>
              Missing VITE_GOOGLE_CLIENT_ID — Google login disabled
            </div>
          )}

          {status && (
            <div
              className="muted"
              style={{ marginTop: 12, color: status.ok ? "green" : "tomato" }}
            >
              {status.msg}
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 14 }}>
            Don’t have an account?{" "}
            <a href="#" onClick={() => navigate("/register")} style={{ color: "var(--primary)", fontWeight: 600 }}>
              Create one
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
