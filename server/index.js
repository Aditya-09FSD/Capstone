// server/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3001;

app.get("/", (req, res) => res.send("Signaling server running."));

// server/server.js

io.on("connection", (socket) => {
  console.log("[SIGNAL-SERVER] connected", socket.id);

  socket.on("join", ({ roomId, name }) => {
    socket.join(roomId);
    console.log(`[SIGNAL-SERVER] ${socket.id} joined ${roomId}`);
    // Notify others
    socket.to(roomId).emit("user-joined", { socketId: socket.id, name });
  });

  // FIX: Handle directed offers (toSocketId)
  socket.on("localDescription", (payload) => {
    const { roomId, toSocketId } = payload;
    if (toSocketId) {
      // Send directly to the specific peer
      io.to(toSocketId).emit("localDescription", payload);
    } else if (roomId) {
      // Broadcast to room (fallback)
      socket.to(roomId).emit("localDescription", payload);
    }
  });

  socket.on("remoteDescription", (payload) => {
    const { toSocketId, roomId } = payload;
    if (toSocketId) {
      io.to(toSocketId).emit("remoteDescription", payload);
    } else if (roomId) {
      socket.to(roomId).emit("remoteDescription", payload);
    }
  });

  socket.on("iceCandidate", (payload) => {
    const { roomId, toSocketId } = payload;
    if (toSocketId) {
      io.to(toSocketId).emit("iceCandidate", payload);
    } else if (roomId) {
      socket.to(roomId).emit("iceCandidate", payload);
    }
  });

  socket.on("disconnect", () => {
    console.log("[SIGNAL-SERVER] disconnect", socket.id);
    socket.broadcast.emit("user-left", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`[SIGNAL-SERVER] listening on :${PORT}`);
});
