export function createRecorder({ getUploadUrl, roomId, userId, timeslice = 5000 }) {
  if (typeof getUploadUrl !== "function") throw new Error("getUploadUrl function required");

  let recorder = null;
  let seq = 0;
  let isRecording = false;

  async function handleDataAvailable(ev) {
    if (!ev.data || ev.data.size === 0) return;
    const thisSeq = seq++;
    const timestamp = Date.now();
    const meta = { roomId, userId, seq: thisSeq, timestamp };

    try {
      const res = await getUploadUrl(ev.data, meta);
      if (res && res.url) {
        const put = await fetch(res.url, { method: "PUT", body: ev.data });
        if (!put.ok) throw new Error("PUT to presigned URL failed");
        if (res.notifyUrl) {
          await fetch(res.notifyUrl, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(meta) });
        }
      }
    } catch (err) {
      console.error("upload chunk failed", err);
    }
  }

  function start(mediaStream) {
    if (!mediaStream) throw new Error("mediaStream required to start recorder");
    if (isRecording) return;
    const mimeCandidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    const mimeType = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m)) || "";
    try {
      recorder = new MediaRecorder(mediaStream, { mimeType });
      recorder.ondataavailable = handleDataAvailable;
      recorder.onstop = () => { isRecording = false; };
      recorder.start(timeslice);
      isRecording = true;
      seq = 0;
      console.log("recorder started, mimeType:", mimeType);
    } catch (err) {
      console.error("start recorder failed", err);
      throw err;
    }
  }

  function stop() {
    if (!recorder) return;
    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch (err) { console.warn(err); }
  }

  return { start, stop, isRecording: () => isRecording };
}