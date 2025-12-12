const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { attachRecordingRoutes } = require("./recordingRoutes"); // Import the routes
const cors = require('cors'); 

const app = express();
app.use(express.json()); // Essential for JSON bodies
app.use(cors()); // Enable CORS for uploads

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3001;

// Initialize recording routes
attachRecordingRoutes(app, { 
    recordingsDir: "./recordings", 
    finalDir: "./final", 
    enableCleanup: true 
});

app.get("/", (req, res) => res.send("Signaling server running."));

/* ... [Your existing Socket.IO logic here] ... */
io.on("connection", (socket) => {
  /* ... copy-paste your existing socket logic from previous step ... */
  console.log("[SIGNAL-SERVER] connected", socket.id);

  socket.on("join", ({ roomId, name }) => {
    socket.join(roomId);
    console.log(`[SIGNAL-SERVER] ${socket.id} joined ${roomId}`);
    socket.to(roomId).emit("user-joined", { socketId: socket.id, name });
  });

  socket.on("localDescription", (payload) => {
    const { roomId, toSocketId } = payload;
    if (toSocketId) {
      io.to(toSocketId).emit("localDescription", payload);
    } else if (roomId) {
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
    socket.broadcast.emit("user-left", socket.id);
  });
});
/* ... end socket logic ... */

server.listen(PORT, () => {
  console.log(`[SIGNAL-SERVER] listening on :${PORT}`);
});