import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register(){
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const navigate = useNavigate();

  async function submit(e){
    e.preventDefault();
    setStatus(null);
    try{
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
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
    <div className="card" style={{maxWidth:480}}>
      <h3>Create Account</h3>
      <p className="muted" style={{fontSize:14}}>Simple demo: username & password only. Passwords are <strong>hashed</strong> on the server.</p>
      <form onSubmit={submit}>
        <div className="space" />
        <label>Username</label>
        <input value={username} onChange={e=>setUsername(e.target.value)} style={{width:"90%"}} placeholder="e.g. alex" autoComplete="username" />
        <div className="space" />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:"90%"}} placeholder="••••••••" autoComplete="new-password" />
        <div className="space" />
        <button className="btn primary" type="submit">Create account</button>
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