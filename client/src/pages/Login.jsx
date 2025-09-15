import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Login(){
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
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
        // Notify header; storage event won't fire in same tab
        window.dispatchEvent(new Event("ttg:user"));
        alert(`Welcome, ${data.username}!`);
        navigate("/", { replace: true });
      }
    } catch {
      setStatus({ ok: false, msg: "Network error" });
    }
  }

  return (
    <div className="card" style={{maxWidth:480}}>
      <h3>Login</h3>
      {justRegistered && (
        <div className="muted" style={{marginBottom:8}}>Account <strong>{justRegistered}</strong> created. Please log in.</div>
      )}
      <form onSubmit={submit}>
        <div className="space" />
        <label>Username</label>
        <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="e.g. alex" autoComplete="username" />
        <div className="space" />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        <div className="space" />
        <button className="btn primary" type="submit">Login</button>
      </form>
      {status && (
        <>
          <div className="space" />
          <div className="muted" style={{color: status.ok ? "inherit" : "tomato"}}>{status.msg}</div>
        </>
      )}
    </div>
  );
}
