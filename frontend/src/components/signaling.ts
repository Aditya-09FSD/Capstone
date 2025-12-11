import { io, Socket } from "socket.io-client";

const SIGNALING_SERVER =
  import.meta.env.VITE_SIGNALING_URL || "http://localhost:3001";

export const socket: Socket = io(SIGNALING_SERVER);

export function joinRoom(roomId: string) {
  socket.emit("join-room", roomId);
}

export function sendSignal(payload: any) {
  socket.emit("signal", payload);
}

export default socket;
