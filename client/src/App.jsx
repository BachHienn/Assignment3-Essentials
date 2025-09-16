import React, { useEffect, useRef, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { socket } from "./socket";

export default function App(){
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => localStorage.getItem("ttg_user"));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const sync = () => setUser(localStorage.getItem("ttg_user"));
    window.addEventListener("storage", sync);
    window.addEventListener("ttg:user", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("ttg:user", sync);
    };
  }, []);

  useEffect(() => {
    function onDocClick(e){
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function logout(){
    const roomId = localStorage.getItem("ttg_current_room");

    const finalize = () => {
      localStorage.removeItem("ttg_user");
      window.dispatchEvent(new Event("ttg:user"));
      setUser(null);
      setMenuOpen(false);
      if (pathname !== "/") navigate("/");
    };

    if (!roomId) {
      // Not in a room → normal logout
      finalize();
      return;
    }

    // In a room → confirm and actually leave on the server before logging out
    const proceed = confirm(`You're currently in a room (${roomId}). Logging out will leave the room. Continue?`);
    if (!proceed) return;

    socket.emit("room:get", { roomId }, (res) => {
      const count = res?.room?.players?.length ?? 0;
      if (count <= 1) {
        const ok = confirm("You're the last player. Leaving will delete this room. Continue to log out?");
        if (!ok) return;
      }
      socket.emit("room:leave", { roomId }, () => {
        localStorage.removeItem("ttg_current_room");
        finalize();
      });
    });
  }

  // Guarded navigation if currently in a room
  const handleGuardedClick = (to) => (e) => {
    const roomId = localStorage.getItem("ttg_current_room");
    if (!roomId) return; // not in a room → allow normal nav
    e.preventDefault();

    const proceed = confirm(`You're currently in a room (${roomId}). Leave and go to ${to === "/lobby" ? "Lobby" : "Home"}?`);
    if (!proceed) return;

    // Fetch fresh count to see if we are the last player
    socket.emit("room:get", { roomId }, (res) => {
      const count = res?.room?.players?.length ?? 0;
      if (count <= 1) {
        const ok = confirm("You're the last player. Leaving will delete this room. Leave & navigate?");
        if (!ok) return;
      }
      socket.emit("room:leave", { roomId }, () => {
        localStorage.removeItem("ttg_current_room");
        navigate(to);
      });
    });
  };

  return (
    <div>
      <header style={{position:"sticky", top:0, backdropFilter:"blur(8px)", borderBottom:"1px solid #eee"}}>
        <div className="container" style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <Link to="/" onClick={handleGuardedClick("/")} style={{textDecoration:"none"}}><h2>🎉 Trivia Task Game</h2></Link>
          <nav className="row" style={{gap:12, alignItems:"center"}}>
            <Link to="/" onClick={handleGuardedClick("/")} className="pill" aria-current={pathname === "/"}>Home</Link>
            {user ? (
              <div ref={menuRef} style={{position:"relative"}}>
                <button className="btn" onClick={() => setMenuOpen(o => !o)} aria-haspopup="menu" aria-expanded={menuOpen}>
                  Hi, {user} ▾
                </button>
                {menuOpen && (
                  <div role="menu" style={{position:"absolute", right:0, top:"calc(100% + 8px)", border:"1px solid #ddd", borderRadius:"10px", padding:"8px", background:"white", boxShadow:"0 10px 30px rgba(0,0,0,.12)"}}>
                    <button className="btn" onClick={logout} role="menuitem" style={{width:"100%"}}>Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="pill" aria-current={pathname === "/login"}>Login</Link>
                <Link to="/register" className="pill" aria-current={pathname === "/register"}>Create Account</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
