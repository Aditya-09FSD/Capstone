const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { spawn } = require("child_process");

function attachRecordingRoutes(app, opts = {}) {
  const RECORDINGS_DIR = path.resolve(opts.recordingsDir || path.join(__dirname, "recordings"));
  const FINAL_DIR = path.resolve(opts.finalDir || path.join(__dirname, "final"));
  const ENABLE_CLEANUP = !!opts.enableCleanup;

  // Ensure directories exist
  if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  if (!fs.existsSync(FINAL_DIR)) fs.mkdirSync(FINAL_DIR, { recursive: true });

  // Storage for chunks
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const roomId = String(req.body.roomId || "unknown_room").replace(/[^a-zA-Z0-9-_]/g, "_");
        const userId = String(req.body.userId || "unknown_user").replace(/[^a-zA-Z0-9-_]/g, "_");
        const dir = path.join(RECORDINGS_DIR, roomId, userId);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      const seq = req.body.seq != null ? String(req.body.seq) : String(Date.now());
      const safeSeq = seq.replace(/[^0-9]/g, "");
      const filename = `chunk_${safeSeq.padStart(6, "0")}.webm`;
      cb(null, filename);
    },
  });
  const upload = multer({ storage });

  /* --- ROUTES --- */

  // 1. Upload Chunk
  app.post("/upload-chunk", upload.single("chunk"), (req, res) => {
    try {
      const { seq } = req.body || {};
      return res.json({ ok: true, seq });
    } catch (err) {
      console.error("upload-chunk error", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // 2. Complete Recording & Stitch
  app.post("/recording/complete", async (req, res) => {
    try {
      const { roomId, userId } = req.body || {};
      if (!roomId || !userId) return res.status(400).json({ ok: false, error: "roomId and userId required" });

      const safeRoom = String(roomId).replace(/[^a-zA-Z0-9-_]/g, "_");
      const safeUser = String(userId).replace(/[^a-zA-Z0-9-_]/g, "_");
      const folder = path.join(RECORDINGS_DIR, safeRoom, safeUser);

      if (!fs.existsSync(folder)) return res.status(400).json({ ok: false, error: "no chunks found" });

      // We await the stitch so we can send the filename back immediately.
      // Note: For very long videos, this might timeout. In production, use background jobs + webhooks.
      const finalPath = await stitchChunks(folder, safeRoom, safeUser, FINAL_DIR);
      
      if (ENABLE_CLEANUP) cleanupFolder(folder);

      const filename = path.basename(finalPath);
      return res.json({ ok: true, message: "ready", filename, downloadUrl: `/download/${filename}` });

    } catch (err) {
      console.error("recording/complete error", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // 3. Download Route
  app.get("/download/:filename", (req, res) => {
    const filename = req.params.filename;
    // Sanitize filename to prevent directory traversal
    const safeFilename = filename.replace(/[^a-zA-Z0-9-_\.]/g, "");
    const filePath = path.join(FINAL_DIR, safeFilename);

    if (fs.existsSync(filePath)) {
      res.download(filePath); // Helper to prompt download
    } else {
      res.status(404).send("File not found or processing not complete.");
    }
  });

  /* --- HELPERS --- */

  function stitchChunks(folderPath, roomId, userId, outDir) {
    return new Promise((resolve, reject) => {
      try {
        const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".webm")).sort();
        if (!files.length) return reject(new Error("no chunks"));

        const listFile = path.join(folderPath, "files.txt");
        // Create FFmpeg file list
        const content = files.map(f => `file '${path.join(folderPath, f).replace(/'/g, "'\\''")}'`).join("\n");
        fs.writeFileSync(listFile, content, "utf8");

        // Output filename: room_user_timestamp.mp4
        const outName = `${roomId}_${userId}_${Date.now()}.mp4`;
        const outPath = path.join(outDir, outName);

        // Run FFmpeg (Concat)
        const args = ["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outPath];
        const ff = spawn("ffmpeg", args);

        ff.stderr.on("data", (d) => { /* console.log(d.toString()); */ }); // Uncomment to debug ffmpeg

        ff.on("exit", (code) => {
          if (code === 0) return resolve(outPath);
          return reject(new Error(`ffmpeg exited with code ${code}`));
        });
        
        ff.on("error", (err) => reject(err));

      } catch (err) {
        return reject(err);
      }
    });
  }

  function cleanupFolder(folderPath) {
    try {
      if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach(f => fs.unlinkSync(path.join(folderPath, f)));
        fs.rmdirSync(folderPath, { recursive: true });
      }
    } catch (err) {
      console.warn("cleanup error", err);
    }
  }

  return () => {};
}

module.exports = { attachRecordingRoutes };