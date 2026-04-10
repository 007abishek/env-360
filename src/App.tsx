import { useEffect, useRef, useState } from "react";
import { useOrientation } from "./hooks/useOrientation";
import { useCamera } from "./hooks/useCamera";
import { useFrameCapture } from "./hooks/useFrameCapture";
import { stitchPanorama, type StitchFrame } from "./utils/stitchPanorama";
import { SEGMENT, covered, getCoverage, resetCoverage, updateCoverage } from "./utils/coverage";
import {
  CAPTURE_INTERVAL_MS,
  DEFAULT_START_DIRECTION,
  DUPLICATE_THRESHOLD,
  MAX_ALLOWED_ROLL_DEG,
  MAX_ANGULAR_JUMP_DEG,
  MAX_ROTATION_SPEED_DEG_PER_SEC,
  MAX_DIRECTION_FLIP_STREAK,
  MAX_OSCILLATION_NET_DEG,
  MAX_SCAN_DURATION_SECONDS,
  MAX_UPRIGHT_PITCH_DEG,
  MIN_DIRECTIONAL_DELTA_DEG,
  MIN_SCAN_DURATION_SECONDS,
  MIN_UPRIGHT_PITCH_DEG,
  OSCILLATION_WINDOW,
  REQUIRED_COVERAGE,
} from "./constants/scanConfig";
import type { CapturePreview, TurnDirection } from "./types/scan";
import { normalizeYaw } from "./utils/directionalGuidance";
import {
  getDirectionFromYaw,
  getMissingSegments,
  getNextTargetSegment,
  getSegmentFromYaw,
  isOscillationPattern,
  isPerpendicularPortrait,
  signedAngleDiff,
} from "./utils/scanHelpers";
import { PanoramaViewer } from "./components/PanoramaViewer";
import { ScanScreen } from "./components/ScanScreen";
import { AFrameInstructions } from "./components/AFrameInstructions";
import { CoverageDirectionMap } from "./components/CoverageDirectionMap";
import { CapturedImagesGrid } from "./components/CapturedImagesGrid";

export default function App() {
  const {
    videoRef,
    cameraError,
    isBackCamera,
    startCamera: startCameraStream,
    attachStreamToVideo,
    setCameraError,
  } = useCamera();
  const { captureFrame, computeFrameHash, hammingDistance } = useFrameCapture();
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
  const { yaw, pitch, roll } = useOrientation();

  const [capturedFrames, setCapturedFrames] = useState<StitchFrame[]>([]);
  const [coverage, setCoverage] = useState(0);
  const [panorama, setPanorama] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [scanHint, setScanHint] = useState("");
  const [capturedPreviews, setCapturedPreviews] = useState<CapturePreview[]>([]);
  const [lockedDirection, setLockedDirection] = useState<TurnDirection>(0);
  const [isDirectionReversalError, setIsDirectionReversalError] = useState(false);
  const totalSegments = Math.floor(360 / SEGMENT);

  const getScanDurationSeconds = () => {
    if (!scanStartedAtRef.current) return 0;
    return Math.floor((Date.now() - scanStartedAtRef.current) / 1000);
  };

  const withinTimeWindow = (seconds: number) => {
    return seconds >= MIN_SCAN_DURATION_SECONDS && seconds <= MAX_SCAN_DURATION_SECONDS;
  };


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
      setCapturedPreviews([]);
      acceptedHashesRef.current = [];
      lastYawRef.current = null;
      lastYawSampleAtRef.current = null;
      lastTurnDirectionRef.current = 0;
      lockedScanDirectionRef.current = 0;
      setLockedDirection(0);
      setIsDirectionReversalError(false);
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

      const currentYaw = yawRef.current;
      const currentPitch = pitchRef.current;
      const currentRoll = rollRef.current;
      const segment = getSegmentFromYaw(currentYaw, SEGMENT);
      const elapsedSeconds = getScanDurationSeconds();

      if (elapsedSeconds > MAX_SCAN_DURATION_SECONDS) {
        setScanHint("Scan timed out. Please restart and complete a smooth full rotation.");
        setCoverage(getCoverage());
        return;
      }

      const postureInvalid = !isPerpendicularPortrait(
        currentPitch,
        currentRoll,
        MIN_UPRIGHT_PITCH_DEG,
        MAX_UPRIGHT_PITCH_DEG,
        MAX_ALLOWED_ROLL_DEG
      );
      if (postureInvalid) {
        setScanHint(
          "Hold phone perpendicular and straight in portrait. Parallel/tilted angles do not count."
        );
        setCoverage(getCoverage());
        return;
      }

      let motionInvalidReason = "";
      if (lastYawRef.current !== null) {
        const yawDelta = signedAngleDiff(currentYaw, lastYawRef.current);
        const absYawDelta = Math.abs(yawDelta);
        const now = Date.now();
        const elapsedMs = lastYawSampleAtRef.current === null ? 0 : now - lastYawSampleAtRef.current;
        const yawSpeedDegPerSec = elapsedMs > 0 ? (absYawDelta / elapsedMs) * 1000 : 0;

        if (absYawDelta > MAX_ANGULAR_JUMP_DEG) {
          motionInvalidReason =
            "Large yaw jump detected. Rotate steadily so movement stays continuous.";
        } else if (yawSpeedDegPerSec > MAX_ROTATION_SPEED_DEG_PER_SEC) {
          motionInvalidReason = "Moving too fast. Move slowly for stable coverage.";
        } else if (absYawDelta >= MIN_DIRECTIONAL_DELTA_DEG) {
          const turnDirection: TurnDirection = yawDelta > 0 ? 1 : -1;

          if (lockedScanDirectionRef.current === 0) {
            lockedScanDirectionRef.current = turnDirection;
            setLockedDirection(turnDirection);
            setScanHint(
              turnDirection > 0
                ? "Direction locked: keep rotating to the right."
                : "Direction locked: keep rotating to the left."
            );
            setIsDirectionReversalError(false);
          } else if (turnDirection !== lockedScanDirectionRef.current) {
            if (getCoverage() < REQUIRED_COVERAGE) {
              setIsDirectionReversalError(true);
            }
            motionInvalidReason =
              "Direction reversed. Keep rotating in one continuous direction for a stable 360 capture.";
          } else {
            setIsDirectionReversalError(false);
          }

          if (
            lastTurnDirectionRef.current !== 0 &&
            turnDirection !== lastTurnDirectionRef.current
          ) {
            directionFlipStreakRef.current += 1;
          } else {
            directionFlipStreakRef.current = 0;
          }

          lastTurnDirectionRef.current = turnDirection;
          turnWindowRef.current.push(turnDirection);
          yawWindowRef.current.push(currentYaw);

          if (turnWindowRef.current.length > OSCILLATION_WINDOW) {
            turnWindowRef.current.shift();
          }
          if (yawWindowRef.current.length > OSCILLATION_WINDOW) {
            yawWindowRef.current.shift();
          }

          if (directionFlipStreakRef.current > MAX_DIRECTION_FLIP_STREAK) {
            motionInvalidReason =
              "Direction changed too often. Keep rotating in one direction.";
          } else if (
            isOscillationPattern(
              turnWindowRef.current,
              yawWindowRef.current,
              OSCILLATION_WINDOW,
              MAX_OSCILLATION_NET_DEG
            )
          ) {
            motionInvalidReason =
              "Oscillation detected. Avoid back-and-forth movement in a small range.";
          }
        }
      }
      lastYawRef.current = currentYaw;
      lastYawSampleAtRef.current = Date.now();

      if (motionInvalidReason) {
        setScanHint(motionInvalidReason);
        setCoverage(getCoverage());
        return;
      }

      const currentHash = computeFrameHash(videoRef.current);
      if (!currentHash) return;

      const frame = captureFrame(videoRef.current, { maxWidth: 1280, quality: 0.98 });
      if (!frame) return;
      const normalizedYaw = normalizeYaw(currentYaw);
      setCapturedFrames((prev) => [
        ...prev,
        {
          src: frame,
          yaw: normalizedYaw,
          capturedAt: Date.now(),
        },
      ]);

      if (!covered.has(segment)) {
        const looksDuplicate = acceptedHashesRef.current.some(
          (existingHash) => hammingDistance(existingHash, currentHash) <= DUPLICATE_THRESHOLD
        );

        if (!looksDuplicate) {
          updateCoverage(currentYaw);
          acceptedHashesRef.current.push(currentHash);
          setScanHint("");

          setCapturedPreviews((prev) => [
            ...prev,
            {
              id: prev.length + 1,
              src: frame,
              timestampSec: elapsedSeconds,
              direction: getDirectionFromYaw(currentYaw),
              yaw: normalizedYaw,
            },
          ]);
        } else {
          setScanHint("View looks similar. Point to a different area to increase coverage.");
        }
      }

      setCoverage(getCoverage());
    }, CAPTURE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isStarted]);

  useEffect(() => {
    yawRef.current = yaw;
    pitchRef.current = pitch;
    rollRef.current = roll;
  }, [yaw, pitch, roll]);

  useEffect(() => {
    if (!isStarted) return;
    void attachStreamToVideo();
  }, [isStarted]);

  const generate = async () => {
    if (capturedFrames.length === 0) {
      alert("No frames captured yet!");
      return;
    }

    const missingSegments = getMissingSegments(totalSegments, covered);
    if (missingSegments.length > 0) {
      const missingAngles = missingSegments.map((segment) => {
        const start = segment * SEGMENT;
        const end = start + SEGMENT;
        return `${start}-${end} deg`;
      });
      alert(
        `Full 360 coverage required before stitching. Missing segments: ${missingAngles.join(", ")}`
      );
      return;
    }

    const scanDurationSeconds = getScanDurationSeconds();
    if (scanDurationSeconds < MIN_SCAN_DURATION_SECONDS) {
      alert(
        `Scan completed too quickly (${scanDurationSeconds}s). Keep rotating for at least ${MIN_SCAN_DURATION_SECONDS}s.`
      );
      return;
    }

    if (scanDurationSeconds > MAX_SCAN_DURATION_SECONDS) {
      alert(
        `Scan exceeded ${MAX_SCAN_DURATION_SECONDS}s. Restart and complete one smooth full rotation.`
      );
      return;
    }

    const pano = await stitchPanorama(capturedFrames);
    setPanorama(pano);
    downloadPanorama(pano);
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
  const nextTargetSegment = getNextTargetSegment(
    yaw,
    SEGMENT,
    totalSegments,
    covered,
    lockedScanDirectionRef.current,
    DEFAULT_START_DIRECTION
  );

  return (
    <div style={{ textAlign: "center", padding: "20px", background: "#020816", color: "#e5edff" }}>
      <h2>360 Degree Environment Scan</h2>
      <AFrameInstructions />

      {!isStarted && (
        <>
          <button
            onClick={startCamera}
            style={{
              padding: "12px 20px",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Start Environment Scan
          </button>
          {cameraError && (
            <p style={{ color: "#f87171", marginTop: "10px" }}>{cameraError}</p>
          )}
        </>
      )}

      {isStarted && (
        <>
          <ScanScreen
            videoRef={videoRef}
            coverage={coverage}
            yaw={yaw}
            showPostureWarning={!isPostureValid}
            lockedDirection={lockedDirection}
            isDirectionWrong={isDirectionWrong}
            invertHorizontal={isBackCamera}
            coveredSegments={Array.from(covered)}
            segmentSize={SEGMENT}
            targetSegment={nextTargetSegment}
          />
          <p>Yaw: {yaw.toFixed(1)} deg</p>
          {scanHint && <p style={{ color: "#f59e0b" }}>{scanHint}</p>}
          <CoverageDirectionMap coveredSegments={Array.from(covered)} segmentSize={SEGMENT} />

          <button
            onClick={generate}
            style={{
              marginTop: "10px",
              padding: "10px 16px",
              cursor: "pointer",
            }}
          >
            Generate Stitched Panorama
          </button>

          <p>
            Scan time: {scanDurationSeconds}s (target {MIN_SCAN_DURATION_SECONDS}-{MAX_SCAN_DURATION_SECONDS}s)
            {" | "}
            Coverage segments: {covered.size}/{totalSegments}
          </p>

          {coverage >= REQUIRED_COVERAGE && <CapturedImagesGrid captures={capturedPreviews} />}

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



