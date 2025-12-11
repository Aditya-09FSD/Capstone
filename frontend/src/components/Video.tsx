import React, { useEffect, useRef } from "react";

type VideoProps = {
  stream?: MediaStream | null;
  autoPlay?: boolean;
  muted?: boolean;
  label?: string;
  style?: React.CSSProperties;
  className?: string;
};

export default function Video({
  stream = null,
  autoPlay = true,
  muted = false,
  label,
  style,
  className
}: VideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (!stream) {
      v.srcObject = null;
      return;
    }

    console.log("[VIDEO] attaching stream", {
      id: stream.id,
      tracks: stream.getTracks().map(t => ({ id: t.id, kind: t.kind }))
    });

    try {
      v.srcObject = stream;
    } catch (err) {
      console.warn("[VIDEO] srcObject error:", err);
    }

    v.onloadedmetadata = () => {
      if (autoPlay) v.play().catch(() => {});
    };
  }, [stream, autoPlay]);

  return (
    <div style={{ position: "relative", ...style }} className={className}>
      {label && (
        <div
          style={{
            position: "absolute",
            left: 8,
            top: 8,
            zIndex: 20,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            padding: "2px 8px",
            borderRadius: 6,
            fontSize: 12
          }}
        >
          {label}
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay={autoPlay}
        playsInline
        muted={muted}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: 6
        }}
      />
    </div>
  );
}
