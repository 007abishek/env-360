import { useEffect, useRef, useState } from "react";
import { useOrientation } from "./hooks/useOrientation";
import { useCamera } from "./hooks/useCamera";
import { useFrameCapture } from "./hooks/useFrameCapture";
import { useOpenCV } from "./hooks/useOpenCV";
import { stitchPanorama, type StitchFrame } from "./utils/stitchPanorama";
import { getSelectedBackend, getBackendUrl } from "./utils/backendConfig";
import { SEGMENT, covered, getCoverage, resetCoverage, updateCoverage } from "./utils/coverage";
import {
  DEFAULT_START_DIRECTION,
  MAX_ALLOWED_ROLL_DEG,
  MAX_ANGULAR_JUMP_DEG,
  MAX_SCAN_DURATION_SECONDS,
  MAX_UPRIGHT_PITCH_DEG,
  MIN_DIRECTIONAL_DELTA_DEG,
  MIN_SCAN_DURATION_SECONDS,
  MIN_UPRIGHT_PITCH_DEG,
  REQUIRED_COVERAGE,
} from "./constants/scanConfig";
import type { CapturePreview, TurnDirection } from "./types/scan";
import { normalizeYaw } from "./utils/directionalGuidance";
import {
  getDirectionFromYaw,
  getNextTargetSegment,
  getSegmentFromYaw,
  isPerpendicularPortrait,
  signedAngleDiff,
} from "./utils/scanHelpers";
import { PanoramaViewer } from "./components/PanoramaViewer";
import { ScanScreen } from "./components/ScanScreen";
import { AFrameInstructions } from "./components/AFrameInstructions";
import { CoverageDirectionMap } from "./components/CoverageDirectionMap";
import { CapturedImagesGrid } from "./components/CapturedImagesGrid";
import { StitchingDiagnostic } from "./components/StitchingDiagnostic";
import { BackendSelector } from "./components/BackendSelector";
import { checkPythonBackend } from "./utils/pythonStitching";

export default function App() {
  const { cv, status: cvStatus } = useOpenCV();
  const {
    videoRef,
    cameraError,
    isBackCamera,
    startCamera: startCameraStream,
    attachStreamToVideo,
    setCameraError,
    permissionState,
    isLoading: cameraLoading,
  } = useCamera();
  const { captureFrame } = useFrameCapture();
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const rollRef = useRef(0);
  const lastYawRef = useRef<number | null>(null);
  const lastYawSampleAtRef = useRef<number | null>(null);
  const lastTurnDirectionRef = useRef<TurnDirection>(0);
  const lockedScanDirectionRef = useRef<TurnDirection>(0);
  const directionFlipStreakRef = useRef(0);
  const turnWindowRef = useRef<TurnDirection[]>([]);
  const yawWindowRef = useRef<number[]>([]);
  const scanStartedAtRef = useRef(0);
  const acceptedHashesRef = useRef<string[]>([]);
  const capturedFramesCountRef = useRef(0);
  const lastCaptureYawRef = useRef<number | null>(null); // Track last capture angle
  const lastCaptureTimeRef = useRef<number>(0); // Track last capture time
  const minTimeBetweenCaptures = 800; // Minimum 800ms between captures
  const minAngleBetweenCaptures = 10; // Minimum 10° rotation (36 frames × 10° = 360°)
  const maxFrames = 36; // Target 36 frames for full 360° coverage
  const { yaw, pitch, roll, hasOrientation } = useOrientation();

  const [capturedFrames, setCapturedFrames] = useState<StitchFrame[]>([]);
  const [coverage, setCoverage] = useState(0);
  const [coveredSegments, setCoveredSegments] = useState<number[]>([]);
  const [panorama, setPanorama] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [scanHint, setScanHint] = useState("");
  const [capturedPreviews, setCapturedPreviews] = useState<CapturePreview[]>([]);
  const [lockedDirection, setLockedDirection] = useState<TurnDirection>(0);
  const [isDirectionReversalError, setIsDirectionReversalError] = useState(false);
  const [yawAxisBaseline, setYawAxisBaseline] = useState<number | null>(null);
  const [blendMode, setBlendMode] = useState<'linear' | 'laplacian'>('linear');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState('');

  // Python backend detection
  const [backendAvailable, setBackendAvailable] = useState(false);
  useEffect(() => {
    const detect = async () => {
      // Try same-origin first (works via Vite proxy / ngrok)
      if (await checkPythonBackend(window.location.origin)) {
        setBackendAvailable(true);
        return;
      }
      // Fallback: direct localhost
      if (await checkPythonBackend('http://localhost:8001')) {
        setBackendAvailable(true);
      }
    };
    detect();
  }, []);
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const lastYawTimeRef = useRef<number>(Date.now());
  const lastYawValueRef = useRef<number>(0);
  const totalSegments = Math.floor(360 / SEGMENT);

  // Calculate rotation speed for professional feedback
  useEffect(() => {
    if (isStarted && hasOrientation) {
      const now = Date.now();
      const timeDelta = (now - lastYawTimeRef.current) / 1000; // seconds
      
      if (timeDelta > 0.1) { // Update every 100ms
        const yawDelta = Math.abs(signedAngleDiff(yaw, lastYawValueRef.current));
        const speed = yawDelta / timeDelta;
        
        setRotationSpeed(speed);
        lastYawTimeRef.current = now;
        lastYawValueRef.current = yaw;
      }
    }
  }, [yaw, isStarted, hasOrientation]);

  const getScanDurationSeconds = () => {
    if (!scanStartedAtRef.current) return 0;
    return Math.floor((Date.now() - scanStartedAtRef.current) / 1000);
  };

  const withinTimeWindow = (seconds: number) => {
    return seconds >= MIN_SCAN_DURATION_SECONDS && seconds <= MAX_SCAN_DURATION_SECONDS;
  };

  // Sync the mutable `covered` Set into React state so UI re-renders
  const syncCoverage = () => {
    setCoverage(getCoverage());
    setCoveredSegments(Array.from(covered));
  };

  // Ref so the interval closure always calls the latest version
  const syncCoverageRef = useRef(syncCoverage);
  useEffect(() => { syncCoverageRef.current = syncCoverage; });


  const startCamera = async () => {
    try {
      setCameraError("");
      setScanHint("");

      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof (DeviceOrientationEvent as any).requestPermission === "function"
      ) {
        const motionPermission = await (DeviceOrientationEvent as any).requestPermission();
        if (motionPermission !== "granted") {
          console.warn("Motion permission denied. Coverage may be less accurate.");
        }
      }
      scanStartedAtRef.current = Date.now();
      setCapturedFrames([]);
      setPanorama("");
      setCoverage(0);
      setCoveredSegments([]);
      setCapturedPreviews([]);
      acceptedHashesRef.current = [];
      capturedFramesCountRef.current = 0;
      lastCaptureYawRef.current = null; // Reset last capture angle
      lastCaptureTimeRef.current = 0; // Reset last capture time
      lastYawRef.current = null;
      lastYawSampleAtRef.current = null;
      lastTurnDirectionRef.current = 0;
      lockedScanDirectionRef.current = 0;
      setLockedDirection(0);
      setIsDirectionReversalError(false);
      setYawAxisBaseline(null);
      directionFlipStreakRef.current = 0;
      turnWindowRef.current = [];
      yawWindowRef.current = [];
      resetCoverage();

      setIsStarted(true);
      await startCameraStream();
    } catch (err) {
      console.error("Camera error:", err);
      const message = err instanceof Error ? err.message : "Camera not working";
      setCameraError(message);
      alert(message);
    }
  };

  useEffect(() => {
    if (!isStarted) return;

    const interval = setInterval(() => {
      if (!videoRef.current) return;
      if (videoRef.current.readyState < 2) return;

      const currentYaw   = yawRef.current;
      const currentPitch = pitchRef.current;
      const currentRoll  = rollRef.current;
      const segment      = getSegmentFromYaw(currentYaw, SEGMENT);
      const elapsedSeconds = getScanDurationSeconds();
      const now = Date.now();

      // ── Always update coverage based on current yaw position ─────────────
      updateCoverage(currentYaw);
      syncCoverageRef.current();

      // ── Stop capture at exactly 36 frames and auto-stitch ────────────────
      if (capturedFramesCountRef.current >= maxFrames) {
        setScanHint(`${maxFrames} frames captured! Stopping capture and stitching...`);
        clearInterval(interval);
        
        // Auto-generate panorama after brief delay
        setTimeout(() => {
          generate();
        }, 1000);
        return;
      }

      // ── 1. Timeout guard ──────────────────────────────────────────────────
      if (elapsedSeconds > MAX_SCAN_DURATION_SECONDS) {
        setScanHint("Scan timed out. Restart and complete a smooth full rotation.");
        clearInterval(interval);
        return;
      }

      // ── 2. SIMPLIFIED Posture check (more lenient) ────────────────────────
      const postureOk = isPerpendicularPortrait(
        currentPitch, currentRoll,
        MIN_UPRIGHT_PITCH_DEG, MAX_UPRIGHT_PITCH_DEG, MAX_ALLOWED_ROLL_DEG
      );
      if (!postureOk) {
        setScanHint("Hold phone upright — tilt detected");
      }

      // ── 3. Track direction ────────────────────────────────────────────────
      if (lastYawRef.current !== null) {
        const yawDelta    = signedAngleDiff(currentYaw, lastYawRef.current);
        const absYawDelta = Math.abs(yawDelta);

        // Only check for extreme jumps
        if (absYawDelta > MAX_ANGULAR_JUMP_DEG * 2) {
          lastYawRef.current = currentYaw;
          lastYawSampleAtRef.current = Date.now();
          return;
        }

        // Track direction
        if (absYawDelta >= MIN_DIRECTIONAL_DELTA_DEG) {
          const dir: TurnDirection = yawDelta > 0 ? 1 : -1;

          if (lockedScanDirectionRef.current === 0) {
            lockedScanDirectionRef.current = dir;
            setLockedDirection(dir);
            setScanHint(dir > 0 ? "Rotating right — keep going!" : "Rotating left — keep going!");
            setIsDirectionReversalError(false);
          }
        }
      }
      lastYawRef.current = currentYaw;
      lastYawSampleAtRef.current = Date.now();

      // ── 4. HYBRID CAPTURE: Check BOTH time AND movement ──────────────────
      let shouldCapture = false;
      let skipReason = "";
      
      if (lastCaptureYawRef.current === null || lastCaptureTimeRef.current === 0) {
        // First frame - always capture
        shouldCapture = true;
      } else {
        // Check TIME condition: At least 800ms since last capture
        const timeSinceLastCapture = now - lastCaptureTimeRef.current;
        const timeConditionMet = timeSinceLastCapture >= minTimeBetweenCaptures;
        
        // Check MOVEMENT condition: At least 8° rotation since last capture
        const angleSinceLastCapture = Math.abs(signedAngleDiff(currentYaw, lastCaptureYawRef.current));
        const movementConditionMet = angleSinceLastCapture >= minAngleBetweenCaptures;
        
        // BOTH conditions must be met
        if (timeConditionMet && movementConditionMet) {
          shouldCapture = true;
        } else {
          // Provide feedback on what's missing
          if (!timeConditionMet) {
            skipReason = `Wait ${Math.ceil((minTimeBetweenCaptures - timeSinceLastCapture) / 100) / 10}s`;
          } else if (!movementConditionMet) {
            skipReason = `Rotate ${(minAngleBetweenCaptures - angleSinceLastCapture).toFixed(1)}° more`;
          }
        }
      }

      // ── 5. Capture frame if BOTH conditions met ──────────────────────────
      if (shouldCapture) {
        const frame = captureFrame(videoRef.current, { maxWidth: 720, quality: 0.88 });
        if (frame) {
          // Update tracking refs
          capturedFramesCountRef.current += 1;
          lastCaptureYawRef.current = currentYaw;
          lastCaptureTimeRef.current = now;

          setCapturedFrames((prev) => [
            ...prev,
            { src: frame, yaw: currentYaw, capturedAt: Date.now(), segment },
          ]);

          setCapturedPreviews((prev) => [
            ...prev,
            {
              id: prev.length + 1,
              src: frame,
              timestampSec: elapsedSeconds,
              direction: getDirectionFromYaw(currentYaw),
              yaw: currentYaw,
            },
          ]);

          const newCoverage = getCoverage();
          setScanHint(
            `Frame ${capturedFramesCountRef.current}/${maxFrames} — ${newCoverage.toFixed(0)}% covered — keep rotating!`
          );
        }
      } else if (skipReason) {
        // Show why frame wasn't captured
        const newCoverage = getCoverage();
        setScanHint(
          `Frame ${capturedFramesCountRef.current}/${maxFrames} — ${newCoverage.toFixed(0)}% — ${skipReason}`
        );
      }
    }, 100); // Check every 100ms (faster polling for responsive feedback)

    return () => clearInterval(interval);
  }, [isStarted]);

  useEffect(() => {
    yawRef.current = yaw;
    pitchRef.current = pitch;
    rollRef.current = roll;
  }, [yaw, pitch, roll]);

  useEffect(() => {
    if (!isStarted) return;
    if (!hasOrientation) return;
    if (yawAxisBaseline !== null) return;
    setYawAxisBaseline(normalizeYaw(yaw));
  }, [isStarted, hasOrientation, yawAxisBaseline, yaw]);

  useEffect(() => {
    if (!isStarted) return;
    void attachStreamToVideo();
  }, [isStarted]);

  const generate = async () => {
    if (capturedFrames.length === 0) {
      alert("No frames captured yet! Rotate your phone to scan the room.");
      return;
    }

    if (capturedFrames.length < 4) {
      alert(`Only ${capturedFrames.length} frames captured. Need at least 4 for a panorama. Keep rotating.`);
      return;
    }

    const scanDurationSeconds = getScanDurationSeconds();
    if (scanDurationSeconds < MIN_SCAN_DURATION_SECONDS) {
      const proceed = window.confirm(
        `Scan only ${scanDurationSeconds}s (recommended: ${MIN_SCAN_DURATION_SECONDS}s+). Stitch anyway?`
      );
      if (!proceed) return;
    }

    try {
      setIsGenerating(true);
      setGenerateProgress('Starting…');

      let pano: string;

      if (backendAvailable) {
        // ── Use backend API for stitching ──────────────────────────────────
        try {
          setGenerateProgress('Preparing images for backend...');
          
          // Create FormData for API request
          const formData = new FormData();
          
          for (let i = 0; i < capturedFrames.length; i++) {
            const frame = capturedFrames[i];
            setGenerateProgress(`Preparing image ${i + 1}/${capturedFrames.length}...`);
            
            // Convert data URL to blob
            const response = await fetch(frame.src);
            const blob = await response.blob();
            
            formData.append('images', blob, `frame_${i}.jpg`);
          }

          // API parameters - Speed optimized
          const selectedBackend = getSelectedBackend()
          const mode = selectedBackend === 'try1' ? 'auto' : '360'  // try1 uses 'auto', try2 uses '360'
          
          const params = new URLSearchParams({
            mode: mode,
            detector: 'orb',
            quality: '85',
            max_dimension: '400',
            confidence_threshold: '0.05'
          })

          console.log('=== APP.TSX PARAMETER DEBUG ===')
          console.log('App.tsx using mode:', mode, 'for backend:', selectedBackend)
          console.log('App.tsx params:', params.toString())
          console.log('=== END APP.TSX PARAMETER DEBUG ===')

          setGenerateProgress('Sending to backend...');

          // Make API request using selected backend
          const selectedBackendUrl = getBackendUrl(selectedBackend)
          
          console.log('=== APP.TSX STITCHING DEBUG ===')
          console.log('Selected backend:', selectedBackend)
          console.log('Selected backend URL:', selectedBackendUrl)
          console.log('=== END DEBUG ===')
          
          // Construct API endpoint
          const apiEndpoint = selectedBackendUrl.includes('/api/') 
            ? `${selectedBackendUrl}/stitch?${params}`  // Proxy mode: /api/try2/stitch
            : `${selectedBackendUrl}/api/stitch?${params}`  // Direct mode: http://localhost:8001/api/stitch
          
          console.log('Final API endpoint (App.tsx):', apiEndpoint)
          
          const apiResponse = await fetch(apiEndpoint, {
            method: 'POST',
            body: formData,
          });

          if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            throw new Error(`Backend error: ${apiResponse.status} - ${errorText}`);
          }

          setGenerateProgress('Processing complete!');

          // Get result as blob and convert to URL
          const resultBlob = await apiResponse.blob();
          pano = URL.createObjectURL(resultBlob);

          // Extract metadata from headers
          const width = apiResponse.headers.get('X-Panorama-Width');
          const height = apiResponse.headers.get('X-Panorama-Height');
          const method = apiResponse.headers.get('X-Stitching-Method');

          setGenerateProgress(`Success! ${width}x${height} panorama using ${method}`);
          
        } catch (err) {
          // Enhanced error handling with specific guidance
          const errorMsg = err instanceof Error ? err.message : String(err);
          let userGuidance = "";
          
          if (errorMsg.includes("insufficient feature matches") || errorMsg.includes("Low feature matches")) {
            userGuidance = "\n\nTips to fix:\n• Ensure 30-50% overlap between frames\n• Avoid plain walls or repetitive patterns\n• Capture in good lighting\n• Hold phone steady to avoid blur";
          } else if (errorMsg.includes("All stitching methods failed")) {
            userGuidance = "\n\nThis usually means:\n• Not enough overlap between images\n• Too much motion blur\n• Repetitive textures (like plain walls)\n• Poor lighting conditions\n\nTry capturing again with more overlap and better lighting.";
          } else if (errorMsg.includes("homography")) {
            userGuidance = "\n\nGeometry estimation failed. Try:\n• More consistent camera height\n• Smoother rotation\n• Better feature-rich scenes";
          }
          
          throw new Error(errorMsg + userGuidance);
        }
      } else {
        // ── Browser-side OpenCV.js fallback ────────────────────────────────
        setGenerateProgress('Backend unavailable — using browser fallback…');
        pano = await stitchPanorama(capturedFrames, { blendMode, cv });
      }

      setPanorama(pano);
      setGenerateProgress('');
      downloadPanorama(pano);
    } catch (err) {
      setGenerateProgress('');
      alert(`Stitching failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPanorama = (imageDataUrl?: string) => {
    const source = imageDataUrl ?? panorama;
    if (!source) return;
    const anchor = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    anchor.href = source;
    anchor.download = `full-panorama-${timestamp}.jpg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const downloadFramesAsZip = async (frames: typeof capturedFrames) => {
    if (frames.length === 0) return;

    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const folder = zip.folder('frames');

    frames.forEach((frame, i) => {
      // Strip data URL prefix to get base64
      const base64 = frame.src.split(',')[1];
      const filename = `frame_${String(i + 1).padStart(3, '0')}.jpg`;
      folder!.file(filename, base64, { base64: true });
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    anchor.href = url;
    anchor.download = `frames-${timestamp}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const scanDurationSeconds = getScanDurationSeconds();
  const passesGenuineScanChecks =
    coverage >= REQUIRED_COVERAGE && withinTimeWindow(scanDurationSeconds);
  const isPostureValid = isPerpendicularPortrait(
    pitch,
    roll,
    MIN_UPRIGHT_PITCH_DEG,
    MAX_UPRIGHT_PITCH_DEG,
    MAX_ALLOWED_ROLL_DEG
  );
  const isDirectionWrong = isDirectionReversalError && coverage < REQUIRED_COVERAGE;
  const activeGuideDirection =
    lockedDirection === 0 ? DEFAULT_START_DIRECTION : lockedDirection;
  const yawAxisDeltaDeg =
    yawAxisBaseline === null ? 0 : signedAngleDiff(normalizeYaw(yaw), yawAxisBaseline);
  const lineProgress = Math.min(1, Math.abs(yawAxisDeltaDeg) / 360);
  const nextTargetSegment = getNextTargetSegment(
    yaw,
    SEGMENT,
    totalSegments,
    covered,
    lockedScanDirectionRef.current,
    DEFAULT_START_DIRECTION
  );

  return (
    <div style={{ 
      minHeight: '100vh',
      textAlign: "center", 
      padding: "20px", 
      background: "#020816", 
      color: "#e5edff" 
    }}>
      <h2>360 Degree Environment Scan</h2>
      
      {/* OpenCV status badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
        background: 'rgba(255,255,255,0.05)', borderRadius: 999, padding: '3px 10px', marginBottom: 8 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: cvStatus === 'ready' ? '#22c55e' : cvStatus === 'error' ? '#f59e0b' : '#3b82f6',
          animation: cvStatus === 'loading' ? 'pulse 1s infinite' : 'none',
        }} />
        <span style={{ color: cvStatus === 'ready' ? '#86efac' : '#9ca3af' }}>
          {cvStatus === 'ready' ? 'OpenCV ready — SIFT matching active' :
           cvStatus === 'error' ? 'OpenCV unavailable — using JS fallback' :
           'Loading OpenCV…'}
        </span>
      </div>

      {/* Backend status badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
        background: 'rgba(255,255,255,0.05)', borderRadius: 999, padding: '3px 10px', marginBottom: 8, marginLeft: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%',
          background: backendAvailable ? '#22c55e' : '#f59e0b' }} />
        <span style={{ color: backendAvailable ? '#86efac' : '#fbbf24' }}>
          {backendAvailable
            ? '🐍 imgalign backend connected'
            : '⚠ Backend offline — run: cd backend && python main.py'}
        </span>
      </div>
      
      {/* Backend selector */}
      <div style={{ display: 'inline-block', marginLeft: 8, marginBottom: 8 }}>
        <BackendSelector />
      </div>
      
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      
      <StitchingDiagnostic />
      
      <AFrameInstructions />

      {!isStarted && (
        <>
          {/* Permission guidance */}
          {permissionState === 'denied' && (
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              background: '#fef3c7',
              borderRadius: '8px',
              border: '2px solid #fbbf24',
              textAlign: 'left',
              maxWidth: '500px',
              margin: '0 auto 16px'
            }}>
              <strong style={{ color: '#92400e' }}>📷 Camera Permission Required</strong>
              <div style={{ fontSize: '14px', marginTop: '8px', color: '#92400e' }}>
                To scan your environment, please:
                <ol style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li>Click the camera icon 📷 in your browser's address bar</li>
                  <li>Select "Allow" for camera access</li>
                  <li>Refresh the page if needed</li>
                </ol>
              </div>
            </div>
          )}

          <button
            onClick={startCamera}
            disabled={cameraLoading}
            style={{
              padding: "12px 20px",
              fontSize: "16px",
              cursor: cameraLoading ? "not-allowed" : "pointer",
              opacity: cameraLoading ? 0.6 : 1,
            }}
          >
            {cameraLoading ? "Starting Camera..." : "Start Environment Scan"}
          </button>
          {cameraError && (
            <div style={{ 
              color: "#f87171", 
              marginTop: "10px",
              whiteSpace: 'pre-line',
              textAlign: 'left',
              maxWidth: '500px',
              margin: '10px auto 0',
              padding: '12px',
              background: 'rgba(248, 113, 113, 0.1)',
              borderRadius: '8px'
            }}>
              <strong>Camera Error:</strong><br />
              {cameraError}
            </div>
          )}
        </>
      )}

      {isStarted && (
        <>
          <ScanScreen
            videoRef={videoRef}
            coverage={coverage}
            yaw={yaw}
            pitch={pitch}
            roll={roll}
            hasOrientation={hasOrientation}
            lineProgress={lineProgress}
            guideDirection={activeGuideDirection}
            yawAxisOffsetDeg={yawAxisDeltaDeg}
            isDirectionLocked={lockedDirection !== 0}
            showPostureWarning={!isPostureValid}
            lockedDirection={lockedDirection}
            isDirectionWrong={isDirectionWrong}
            invertHorizontal={isBackCamera}
            coveredSegments={coveredSegments}
            segmentSize={SEGMENT}
            targetSegment={nextTargetSegment}
            capturedFrames={capturedFrames.length}
            targetFrames={36}
            rotationSpeed={rotationSpeed}
            onToggleDirection={
              lockedDirection === 0
                ? undefined
                : () => {
                    const flipped: TurnDirection = lockedDirection > 0 ? -1 : 1;
                    lockedScanDirectionRef.current = flipped;
                    setLockedDirection(flipped);
                  }
            }
          />
          <p>Yaw: {yaw.toFixed(1)} deg</p>
          {scanHint && <p style={{ color: "#f59e0b" }}>{scanHint}</p>}
          <CoverageDirectionMap coveredSegments={coveredSegments} segmentSize={SEGMENT} />

          <button
            onClick={generate}
            disabled={isGenerating}
            style={{
              marginTop: "10px",
              padding: "10px 16px",
              cursor: isGenerating ? "not-allowed" : "pointer",
              opacity: isGenerating ? 0.6 : 1,
            }}
          >
            {isGenerating ? "⏳ Generating…" : "Generate Stitched Panorama"}
          </button>
          {generateProgress && (
            <div style={{ marginTop: 6, fontSize: 13, color: '#93c5fd' }}>
              {generateProgress}
            </div>
          )}

          {/* Blend mode toggle */}
          <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "center" }}>
            {(["linear", "laplacian"] as const).map(m => (
              <button
                key={m}
                onClick={() => setBlendMode(m)}
                style={{
                  padding: "5px 14px", fontSize: 12, borderRadius: 6,
                  background: blendMode === m ? "#3b82f6" : "#1e293b",
                  color: "#fff", border: "1px solid #374151", cursor: "pointer",
                  fontWeight: blendMode === m ? 700 : 400,
                }}
              >
                {m === "linear" ? "⚡ Linear" : "🔺 Laplacian"}
              </button>
            ))}
          </div>

          <p>
            Scan time: {scanDurationSeconds}s
            {" | "}
            Frames: {capturedFrames.length}
            {" | "}
            Coverage: {covered.size}/{totalSegments} segments
          </p>

          {coverage >= REQUIRED_COVERAGE && <CapturedImagesGrid captures={capturedPreviews} />}

          {capturedFrames.length > 0 && (
            <button
              onClick={() => downloadFramesAsZip(capturedFrames)}
              style={{
                marginTop: "8px",
                padding: "10px 16px",
                cursor: "pointer",
                background: "#1e293b",
                color: "#fff",
                border: "1px solid #374151",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            >
              📦 Download {capturedFrames.length} Frames as ZIP
            </button>
          )}

          {panorama && <PanoramaViewer image={panorama} />}
          {panorama && (
            <button
              onClick={() => downloadPanorama()}
              style={{
                marginTop: "12px",
                padding: "10px 16px",
                cursor: "pointer",
              }}
            >
              Download Full Panorama
            </button>
          )}
          {panorama && <h2>Result: {passesGenuineScanChecks ? "PASS" : "FAIL"}</h2>}
        </>
      )}
    </div>
  );
}

