import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Login(){
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID; // NEW
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = location.state?.justRegistered;

  async function submit(e){
    e.preventDefault();
    setStatus(null);
    try{
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus({ ok: false, msg: data.error || "Login failed" });
      } else {
        localStorage.setItem("ttg_user", data.username);
        window.dispatchEvent(new Event("ttg:user"));
        alert(`Welcome, ${data.username}!`);
        navigate("/", { replace: true });
      }
    } catch {
      setStatus({ ok: false, msg: "Network error" });
    }
  }

  // NEW: Google Identity Services button
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
              body: JSON.stringify({ credential: response.credential })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || "Google login failed");
            localStorage.setItem("ttg_user", data.username);
            window.dispatchEvent(new Event("ttg:user"));
            alert(`Welcome, ${data.username}!`);
            navigate("/", { replace: true });
          } catch (err) {
            setStatus({ ok:false, msg: err.message || "Google login failed" });
          }
        },
      });
      const el = document.getElementById("gsi-btn");
      if (el){
        window.google?.accounts.id.renderButton(el, { theme: "outline", size: "large", text: "continue_with", shape: "pill" });
      }
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [GOOGLE_CLIENT_ID]);

  return (
    <div className="card" style={{maxWidth:480}}>
      <h3>Login</h3>
      {justRegistered && (
        <div className="muted" style={{marginBottom:8}}>Account <strong>{justRegistered}</strong> created. Please log in.</div>
      )}
      <form onSubmit={submit}>
        <div className="space" />
        <label>Username</label>
        <input value={username} onChange={e=>setUsername(e.target.value)} style={{width:"95%"}} placeholder="e.g. alex" autoComplete="username" />
        <div className="space" />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:"95%"}} placeholder="••••••••" autoComplete="current-password" />
        <div className="space" />
        <button className="btn primary" type="submit">Login</button>
      </form>

      {/* Divider */}
      <div className="space" />
      <div className="muted" style={{display:"flex", alignItems:"center", gap:8}}>
        <span style={{flex:1, height:1, background:"#eee"}} />
        <span>or</span>
        <span style={{flex:1, height:1, background:"#eee"}} />
      </div>
      <div className="space" />

      {/* Google button mounts here */}
      <div id="gsi-btn" style={{ display: GOOGLE_CLIENT_ID ? "block" : "none" }} />
      {!GOOGLE_CLIENT_ID && (
        <div className="muted" style={{color:"tomato", fontSize:12}}>Missing VITE_GOOGLE_CLIENT_ID — Google login disabled</div>
      )}

      {status && (
        <>
          <div className="space" />
          <div className="muted" style={{color: status.ok ? "inherit" : "tomato"}}>{status.msg}</div>
        </>
      )}
    </div>
  );
}