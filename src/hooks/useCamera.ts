import { useEffect, useRef, useState } from "react";

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [isBackCamera, setIsBackCamera] = useState(true);

  const attachStreamToVideo = async () => {
    if (!videoRef.current || !streamRef.current) return;

    videoRef.current.srcObject = streamRef.current;
    videoRef.current.setAttribute("playsinline", "true");
    videoRef.current.setAttribute("webkit-playsinline", "true");
    videoRef.current.muted = true;

    try {
      await videoRef.current.play();
    } catch (playErr) {
      console.warn("Video play warning:", playErr);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startCamera = async () => {
    setCameraError("");

    if (!window.isSecureContext) {
      const message =
        "Camera access requires HTTPS (or localhost). Open the app with https:// on your phone.";
      setCameraError(message);
      throw new Error(message);
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      const message = "This browser does not support camera access.";
      setCameraError(message);
      throw new Error(message);
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } },
        audio: false,
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
    }

    streamRef.current = stream;
    const facingMode = stream.getVideoTracks()[0]?.getSettings().facingMode;
    setIsBackCamera(facingMode === "environment");
    await attachStreamToVideo();
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return {
    videoRef,
    cameraError,
    isBackCamera,
    startCamera,
    attachStreamToVideo,
    stopCamera,
    setCameraError,
  };
};
