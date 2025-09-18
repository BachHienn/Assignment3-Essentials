import React, { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { socket } from "./socket";
import Footer from "./pages/Footer";

export default function App() {
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
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function logout() {
    const roomId = localStorage.getItem("ttg_current_room");

    const finalize = () => {
      localStorage.removeItem("ttg_user");
      window.dispatchEvent(new Event("ttg:user"));
      setUser(null);
      setMenuOpen(false);
      if (pathname !== "/") navigate("/");
    };

    if (!roomId) {
      finalize();
      return;
    }

    const proceed = confirm(
      `You're currently in a room (${roomId}). Logging out will leave the room. Continue?`
    );
    if (!proceed) return;

    socket.emit("room:get", { roomId }, (res) => {
      const count = res?.room?.players?.length ?? 0;
      if (count <= 1) {
        const ok = confirm(
          "You're the last player. Leaving will delete this room. Continue to log out?"
        );
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
    if (!roomId) return;
    e.preventDefault();

    const proceed = confirm(
      `You're currently in a room (${roomId}). Leave and go to ${
        to === "/lobby" ? "Lobby" : "Home"
      }?`
    );
    if (!proceed) return;

    socket.emit("room:get", { roomId }, (res) => {
      const count = res?.room?.players?.length ?? 0;
      if (count <= 1) {
        const ok = confirm(
          "You're the last player. Leaving will delete this room. Leave & navigate?"
        );
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
      <header
        style={{
          position: "sticky",
          top: 0,
          background: "linear-gradient(90deg, var(--primary), var(--accent))",
          color: "#fff",
          borderBottom: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,.1)",
          zIndex: 10,
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Left side title */}
          <NavLink
            to="/"
            end
            onClick={handleGuardedClick("/")}
            style={{ textDecoration: "none", color: "#fff" }}
          >
            <h2 style={{ margin: 0 }}>🎉 Trivia Task Game</h2>
          </NavLink>

          {/* Navbar links */}
          <nav className="row" style={{ gap: 12, alignItems: "center" }}>
            <NavLink
              to="/"
              end
              onClick={handleGuardedClick("/")}
              className={({ isActive }) =>
                isActive ? "pill active" : "pill"
              }
            >
              Home
            </NavLink>

            {user ? (
              <div ref={menuRef} style={{ position: "relative" }}>
                <button
                  className="btn"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  Hi, {user} ▾
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      border: "1px solid #ddd",
                      borderRadius: "10px",
                      padding: "8px",
                      background: "white",
                      boxShadow: "0 10px 30px rgba(0,0,0,.12)",
                    }}
                  >
                    <button
                      className="btn"
                      onClick={logout}
                      role="menuitem"
                      style={{ width: "100%" }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    isActive ? "pill active" : "pill"
                  }
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    isActive ? "pill active" : "pill"
                  }
                >
                  Create Account
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>

      {/* Footer appears after scroll */}
      <Footer />
    </div>
  );
}
