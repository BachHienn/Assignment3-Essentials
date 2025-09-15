import { io } from "socket.io-client";

// Single shared socket instance for the app
export const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3001", {
  autoConnect: true
});
