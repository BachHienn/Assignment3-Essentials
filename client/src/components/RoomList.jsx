import React from "react";
import { Link } from "react-router-dom";


export default function RoomList({ rooms = [] }){
const me = (localStorage.getItem("ttg_user") || "").trim().toLowerCase();


function flashCard(id){
const el = document.getElementById(`room-${id}`);
if (el){
el.style.background = "#ffe6e6";
el.style.borderColor = "#ff8a8a";
setTimeout(() => {
// revert to stylesheet defaults
el.style.background = "";
el.style.borderColor = "";
}, 600);
}
}


const alreadyInRoom = (room) => me && room.players.some(p => (p.name || "").toLowerCase() === me);


return (
<div className="card">
{rooms.length === 0 && (<p className="muted">No rooms yet. Create one!</p>)}
<div className="grid">
{rooms.map(room => {
const isFull = room.players.length >= room.max;
const isMeHere = alreadyInRoom(room);
return (
<div key={room.id} id={`room-${room.id}`} className="card" style={{ transition: "background 200ms, border-color 200ms" }}>
<div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
<strong>Code: {room.id}</strong>
<span className="pill">{room.players.length}/{room.max}</span>
</div>
<div
className="muted"
style={{
fontSize: 14,
padding: "10px 0px",
overflow: "hidden",
textOverflow: "ellipsis",
whiteSpace: "nowrap"
}}
>
{room.name}
</div>
<div className="space" />
<div className="muted" style={{fontSize:14, padding:"10px 0px"}}>Players: {room.players.map(p=>p.name).join(", ") || "—"}</div>
<div className="space" />
<Link
to={`/room/${room.id}`}
className="btn"
aria-disabled={isFull || isMeHere}
onClick={(e)=>{
if (isMeHere) {
e.preventDefault();
alert("You are already in this room");
flashCard(room.id);
return;
}
if (isFull) {
e.preventDefault();
alert(`Room is full (max ${room.max})`);
flashCard(room.id);
}
}}
>
{isMeHere ? "Already Joined" : "Join"}
</Link>
</div>
);
})}
</div>
</div>
);
}