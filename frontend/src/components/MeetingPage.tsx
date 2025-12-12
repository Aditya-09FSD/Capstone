// src/components/MeetingPageCombined.tsx
import React, { useEffect, useRef, useState } from "react";
import Video from "./Video";
import MeetingCard from "./MeetingCard";
import { Button } from "@/components/ui/button";
import {
  Video as VideoIcon,
  Mic,
  MicOff,
  RefreshCw,
  LogOut,
  Monitor,
  CircleDot
} from "lucide-react";

// Imports
import { socket } from "./signaling"; 
// Adjust this path if recorder.js is in src/ but this file is in src/components/
import { createRecorder } from "./recorder"; 

/* ---------- Configuration ---------- */
// TODO: Change this to your production backend URL when deploying
const SERVER_URL = "http://localhost:3001";

/* ---------- Types ---------- */
type MaybeMediaStream = MediaStream | undefined;

export default function MeetingPageCombined() {
  /* ---------- States ---------- */
  const [joined, setJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MaybeMediaStream>();
  const [remoteStreamsMap, setRemoteStreamsMap] = useState<Record<string, MediaStream>>({});
  const [roomId, setRoomId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // UI toggle states
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  /* ---------- Refs (Critical for Socket Callbacks & Media Logic) ---------- */
  const localStreamRef = useRef<MaybeMediaStream>();
  const roomIdRef = useRef<string | null>(null);
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  
  // Recorder Refs
  const recorderRef = useRef<any>(null); 
  const originalCameraTrackRef = useRef<MediaStreamTrack | null>(null);
  
  // Keep refs synced with state so socket listeners always see current data
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  /* ---------- Peer Connection Helper ---------- */
  function createPeerConnectionFor(peerId: string) {
    if (pcsRef.current[peerId]) return pcsRef.current[peerId];

    console.log(`[WEBRTC] Creating PC for ${peerId}`);
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    // 1. Handle Remote Tracks (Video/Audio)
    pc.ontrack = (ev: RTCTrackEvent) => {
      console.log(`[WEBRTC] Track received from ${peerId}`, ev.streams[0].id);
      const remoteStream = ev.streams[0];
      if (remoteStream) {
        setRemoteStreamsMap(prev => ({ ...prev, [peerId]: remoteStream }));
      }
    };

    // 2. Handle ICE Candidates
    pc.onicecandidate = (e) => {
      if (e.candidate && roomIdRef.current) {
        socket.emit("iceCandidate", {
          toSocketId: peerId, // Target specific peer
          fromSocketId: socket.id,
          candidate: e.candidate,
          roomId: roomIdRef.current
        });
      }
    };

    pcsRef.current[peerId] = pc;
    return pc;
  }

  function removePeer(peerId: string) {
    const pc = pcsRef.current[peerId];
    if (pc) {
      pc.close();
      delete pcsRef.current[peerId];
    }
    setRemoteStreamsMap(prev => {
      const copy = { ...prev };
      delete copy[peerId];
      return copy;
    });
  }

  // Safely add tracks to PC
  const addLocalTracksToPeer = (pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach(track => {
      const senders = pc.getSenders();
      const exists = senders.some(s => s.track?.id === track.id);
      if (!exists) {
        pc.addTrack(track, stream);
      }
    });
  };

  /* ---------- Initiator Logic (Create Offer) ---------- */
  const createOfferFor = async (targetSocketId: string) => {
    console.log(`[WEBRTC] Creating offer for ${targetSocketId}`);
    const pc = createPeerConnectionFor(targetSocketId);

    // Add local media BEFORE creating offer
    if (localStreamRef.current) {
      addLocalTracksToPeer(pc, localStreamRef.current);
    }

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("localDescription", {
        description: pc.localDescription,
        fromSocketId: socket.id,
        toSocketId: targetSocketId, // Direct routing
        roomId: roomIdRef.current
      });
    } catch (err) {
      console.error("[WEBRTC] Offer creation failed", err);
    }
  };

  /* ---------- Socket Listeners (Run ONCE on mount) ---------- */
  useEffect(() => {
    const s = socket;
    
    // 1. Incoming Offer (We are the receiver)
    const onLocalDescription = async (payload: any) => {
      const { description, fromSocketId } = payload;
      if (!description || fromSocketId === s.id) return;
      console.log(`[SIGNAL] Received Offer from ${fromSocketId}`);

      const pc = createPeerConnectionFor(fromSocketId);

      // Add our video to the reply
      if (localStreamRef.current) {
        addLocalTracksToPeer(pc, localStreamRef.current);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(description));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("remoteDescription", {
          description: pc.localDescription,
          fromSocketId: s.id,
          toSocketId: fromSocketId, // Direct reply
          roomId: roomIdRef.current
        });
      } catch (err) {
        console.error("[SIGNAL] Error handling offer:", err);
      }
    };

    // 2. Incoming Answer (We are the initiator)
    const onRemoteDescription = async (payload: any) => {
      const { description, fromSocketId } = payload;
      if (!description || fromSocketId === s.id) return;
      console.log(`[SIGNAL] Received Answer from ${fromSocketId}`);

      const pc = pcsRef.current[fromSocketId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(description));
        } catch (err) {
          console.error("[SIGNAL] Error setting remote description:", err);
        }
      }
    };

    // 3. ICE Candidate
    const onIceCandidate = async (payload: any) => {
      const { candidate, fromSocketId } = payload;
      if (!candidate || fromSocketId === s.id) return;

      const pc = pcsRef.current[fromSocketId];
      if (pc) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          console.warn("[SIGNAL] ICE Error", err);
        }
      }
    };

    // 4. New User Joined
    const onUserJoined = (payload: any) => {
      const { socketId: newPeerId } = payload || {};
      if (newPeerId && newPeerId !== s.id) {
        console.log(`[SIGNAL] User joined: ${newPeerId} -> Sending Offer`);
        createOfferFor(newPeerId);
      }
    };

    const onUserLeft = (payload: any) => {
      const targetId = typeof payload === "string" ? payload : payload?.socketId;
      if (targetId) removePeer(targetId);
    };

    // Attach Listeners
    s.on("localDescription", onLocalDescription);
    s.on("remoteDescription", onRemoteDescription);
    s.on("iceCandidate", onIceCandidate);
    s.on("user-joined", onUserJoined);
    s.on("user-left", onUserLeft);

    // Cleanup
    return () => {
      s.off("localDescription", onLocalDescription);
      s.off("remoteDescription", onRemoteDescription);
      s.off("iceCandidate", onIceCandidate);
      s.off("user-joined", onUserJoined);
      s.off("user-left", onUserLeft);
    };
  }, []); // Run once on mount

  /* ---------- Feature Controls ---------- */
  
  // 1. Mute/Unmute
  const toggleMute = () => {
    if (localStream) {
        localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
        setIsMuted(!isMuted);
    }
  };

  // 2. Video On/Off
  const toggleVideo = () => {
    if (localStream) {
        localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
        setIsVideoOn(!isVideoOn);
    }
  };

  // 3. Flip Camera
  const flipCamera = async () => {
    if (!localStream) return;
    const currentVideoTrack = localStream.getVideoTracks()[0];
    if (!currentVideoTrack) return;
    
    const isUserFacing = currentVideoTrack.getSettings().facingMode === 'user';
    const constraints = { video: { facingMode: isUserFacing ? { exact: "environment" } : "user" } };

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newStream.getVideoTracks()[0];

      // Replace sender track on all peers
      Object.values(pcsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) sender.replaceTrack(newVideoTrack);
      });

      // Update local state
      setLocalStream(prev => {
        if (!prev) return newStream;
        const audioTracks = prev.getAudioTracks();
        currentVideoTrack.stop(); // Stop old track
        return new MediaStream([...audioTracks, newVideoTrack]);
      });

    } catch (err) {
      console.error("Flip failed", err);
    }
  };

  // 4. Screen Share
  const startScreenShare = async () => {
    if (!localStream) return;
    try {
      // @ts-ignore 
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const displayTrack = display.getVideoTracks()[0];
      
      // Save original camera track to switch back later
      originalCameraTrackRef.current = localStream.getVideoTracks()[0];

      // Replace on all peers
      Object.values(pcsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) sender.replaceTrack(displayTrack);
      });

      // Update local preview
      setLocalStream(new MediaStream([displayTrack, ...localStream.getAudioTracks()]));
      setIsScreenSharing(true);

      displayTrack.onended = () => stopScreenShare();
    } catch (err) {
      console.error("Screen share failed", err);
    }
  };

  const stopScreenShare = async () => {
    const camTrack = originalCameraTrackRef.current;
    if (!camTrack) return;

    // Replace back to camera on all peers
    Object.values(pcsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) sender.replaceTrack(camTrack);
    });

    setLocalStream(new MediaStream([camTrack, ...localStream!.getAudioTracks()]));
    setIsScreenSharing(false);
  };

  /* ---------- Recording Logic (Server Side) ---------- */

  // Helper: Upload chunk to server
  async function postUpload(blob: Blob, meta: any) {
    const form = new FormData();
    form.append("chunk", blob);
    form.append("roomId", meta.roomId);
    form.append("userId", meta.userId);
    form.append("seq", meta.seq);
    form.append("timestamp", meta.timestamp);
    
    // Upload to our Express server
    const res = await fetch(`${SERVER_URL}/upload-chunk`, { method: "POST", body: form });
    if (!res.ok) throw new Error("upload failed");
    return { ok: true };
  }

  const startRecording = () => {
    if (!localStream || !roomId) return;
    
    // Initialize the recorder utility
    const rec = createRecorder({
        getUploadUrl: postUpload,
        roomId: roomId,
        userId: socket.id || "unknown_user",
        timeslice: 3000 // Send chunks every 3 seconds
    });

    try {
      // Start recording the local stream (can be changed to combined stream if using canvas)
      rec.start(localStream);
      recorderRef.current = rec;
      setIsRecording(true);
      console.log("Recording started...");
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = async () => {
    if (recorderRef.current) {
        recorderRef.current.stop();
        recorderRef.current = null;
        setIsRecording(false);
        console.log("Recording stopped. Telling server to stitch...");

        // Notify server to stitch chunks
        try {
            const res = await fetch(`${SERVER_URL}/recording/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomId, userId: socket.id || "unknown_user" })
            });
            const data = await res.json();
            if (data.ok) {
                alert("Recording saved! Server is processing video.");
            } else {
                console.error("Stitching failed", data);
            }
        } catch (err) {
            console.error("Failed to trigger stitch", err);
        }
    }
  };

  /* ---------- Main Join Flow ---------- */
  const joinMeeting = async (name: string, meetingId: string) => {
    setUserName(name);
    setRoomId(meetingId);

    try {
      // 1. Get Camera Access
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setIsMuted(false);
      setIsVideoOn(true);

      // 2. Emit Join (using raw socket emit to ensure correct payload)
      socket.emit("join", { roomId: meetingId, name });
      setJoined(true);
      console.log(`[JOIN] Joined room: ${meetingId}`);

    } catch (err) {
      console.error("Join Error:", err);
      alert("Could not access camera/mic.");
    }
  };

  const leaveMeeting = () => {
    if (isRecording) stopRecording();
    localStream?.getTracks().forEach(t => t.stop());
    Object.values(pcsRef.current).forEach(pc => pc.close());
    socket.disconnect(); 
    window.location.reload(); 
  };

  /* ---------- Render ---------- */
  if (!joined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <MeetingCard 
            onJoin={joinMeeting} 
            onCreate={(id) => {
                const newId = id || `meet-${Math.random().toString(36).slice(2, 7)}`;
                setRoomId(newId);
                return newId;
            }} 
            initialMeetingId={roomId || ""}
        />
      </div>
    );
  }

  const remoteEntries = Object.entries(remoteStreamsMap);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Local Video */}
        <div>
           <h3 className="text-sm font-medium mb-2">You ({userName}) - {roomId}</h3>
           <div className="rounded-lg border overflow-hidden bg-black h-[400px] relative">
             <Video stream={localStream} />
             <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
                {isMuted ? "Mic Off" : "Mic On"}
             </div>
           </div>
        </div>

        {/* Remote Video */}
        <div>
          <h3 className="text-sm font-medium mb-2">Remote Peer</h3>
          <div className="rounded-lg border overflow-hidden bg-black h-[400px] relative">
            {remoteEntries.length > 0 ? (
                <Video stream={remoteEntries[0][1]} />
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                    Waiting for others to join...
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t flex justify-center gap-4 flex-wrap">
          <Button variant="outline" onClick={toggleMute}>
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button variant="outline" onClick={toggleVideo}>
             <VideoIcon className="w-5 h-5" />
          </Button>

          <Button variant="outline" onClick={flipCamera}>
            <RefreshCw className="w-5 h-5" />
          </Button>

          <Button variant="outline" onClick={isScreenSharing ? stopScreenShare : startScreenShare}>
            <Monitor className="w-5 h-5 text-blue-500" />
            <span className="ml-2 hidden sm:inline">{isScreenSharing ? "Stop" : "Share"}</span>
          </Button>

          <Button variant="outline" onClick={isRecording ? stopRecording : startRecording}>
             <CircleDot className={`w-5 h-5 ${isRecording ? "text-red-500 animate-pulse" : ""}`} />
             <span className="ml-2 hidden sm:inline">{isRecording ? "Stop Rec" : "Record"}</span>
          </Button>
          
          <Button variant="destructive" onClick={leaveMeeting}>
            <LogOut className="w-5 h-5" />
          </Button>
      </div>
    </div>
  );
}