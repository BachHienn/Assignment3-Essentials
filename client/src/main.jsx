import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Home from "./pages/Home.jsx";
import Lobby from "./pages/Lobby.jsx";
import Room from "./pages/Room.jsx";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import SinglePlayer from "./pages/SingePlayer.jsx";
import "./styles.css"

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}> 
          <Route path="/" element={<Home />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/single" element={<SinglePlayer />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);