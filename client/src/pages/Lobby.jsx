import React, { useEffect, useState } from "react";
import { socket } from "../socket";
import CreateRoomForm from "../components/CreateRoomForm.jsx";
import RoomList from "../components/RoomList.jsx";

export default function Lobby(){
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    function onList(payload){ setRooms(payload || []); }
    socket.on("rooms:list", onList);
    socket.emit("rooms:get");
    return () => {
      socket.off("rooms:list", onList);
    };
  }, []);

  return (
    <div className="grid">
      <CreateRoomForm />
      <RoomList rooms={rooms} />
    </div>
  );
}