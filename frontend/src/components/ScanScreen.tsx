import { useEffect, useRef, useState, type RefObject } from "react";
import type { TurnDirection } from "../types/scan";
import {
  PANORAMA_LEVEL_MAX_COMBINED_DRIFT_DEG,
  PANORAMA_LEVEL_MAX_PITCH_DRIFT_DEG,
  PANORAMA_LEVEL_MAX_ROLL_DRIFT_DEG,
  PANORAMA_LEVEL_TARGET_PITCH_DEG,
  PROFESSIONAL_CAPTURE_CONFIG,
} from "../constants/scanConfig";
import { getPanoramaLevelState } from "../utils/scanHelpers";

type ScanScreenProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  coverage: number;
  coveredSegments?: number[];
  segmentSize?: number;
  showPostureWarning: boolean;
  isDirectionWrong?: boolean;
  invertHorizontal?: boolean;
  yaw?: number;
  pitch?: number;
  roll?: number;
  hasOrientation?: boolean;
  lineProgress?: number;
  guideDirection?: TurnDirection;
  yawAxisOffsetDeg?: number;
  isDirectionLocked?: boolean;
  lockedDirection?: TurnDirection;
  onToggleDirection?: () => void;
  capturedFrames?: number;
  targetFrames?: number;
  rotationSpeed?: number;
  [key: string]: unknown;
};

export const ScanScreen = ({
  videoRef,
  coverage,
  isDirectionWrong = false,
  yaw = 0,
  pitch = 0,
  roll = 0,
  hasOrientation = false,
  lineProgress = 0,
  guideDirection = -1,
  isDirectionLocked = false,
  capturedFrames = 0,
  targetFrames = PROFESSIONAL_CAPTURE_CONFIG.TARGET_FRAMES,
}: ScanScreenProps) => {
  const alignment = getPanoramaLevelState(
    pitch,
    roll,
    PANORAMA_LEVEL_TARGET_PITCH_DEG,
    PANORAMA_LEVEL_MAX_PITCH_DRIFT_DEG,
    PANORAMA_LEVEL_MAX_ROLL_DRIFT_DEG,
    PANORAMA_LEVEL_MAX_COMBINED_DRIFT_DEG
  );

  const rawTiltPx = hasOrientation ? alignment.verticalOffsetPx : 0;
  const tiltPx    = Math.max(-48, Math.min(48, rawTiltPx));
  const isAligned = Math.abs(tiltPx) <= 8; // Arrow is on the line
  
  // ── Level check: phone must be level for proper panorama capture ──
  const isPhoneLevel = Math.abs(tiltPx) <= 12; // Within acceptable level range

  // ── Motion detection ───────────────────────────────────────────────────────
  const prevYawRef = useRef(yaw);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const delta = Math.abs(((yaw - prevYawRef.current + 540) % 360) - 180);
    prevYawRef.current = yaw;
    if (delta > 0.4) {
      setIsMoving(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setIsMoving(false), 600);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [yaw]);

  // ── Horizontal arrow position ──────────────────────────────────────────────
  const START_PCT = 5;
  const END_PCT   = 95;
  const SPAN_PCT  = END_PCT - START_PCT;
  const clamped   = Math.min(1, Math.max(0, lineProgress));
  const leftPct   = isDirectionLocked
    ? START_PCT + SPAN_PCT * clamped
    : START_PCT + SPAN_PCT / 2;
  const isDone    = clamped >= 0.97;

  const [displayLeft, setDisplayLeft] = useState(leftPct);
  const [displayTilt, setDisplayTilt] = useState(tiltPx);

  const prevDirRef = useRef(guideDirection);
  useEffect(() => {
    if (guideDirection !== prevDirRef.current) {
      prevDirRef.current = guideDirection;
      setDisplayLeft(leftPct);
    }
  }, [guideDirection, leftPct]);

  // Smooth horizontal movement
  useEffect(() => {
    const timer = setTimeout(() => setDisplayLeft(leftPct), 16);
    return () => clearTimeout(timer);
  }, [leftPct]);

  // Smooth vertical movement with easing
  useEffect(() => {
    const smoothTilt = () => {
      setDisplayTilt(prev => {
        const diff = tiltPx - prev;
        if (Math.abs(diff) < 0.5) return tiltPx;
        return prev + diff * 0.15; // Smooth easing factor
      });
    };
    
    const interval = setInterval(smoothTilt, 16); // 60fps
    return () => clearInterval(interval);
  }, [tiltPx]);

  // Arrow color: white when level and aligned, yellow when phone tilted, red when wrong direction
  const arrowColor = !isPhoneLevel ? "#ef4444" : isAligned ? "#ffffff" : "#f59e0b";

  // Frame counter color
  const frameProgress = Math.min(1, capturedFrames / targetFrames);

  // Status text
  const isNearCompletion = (coverage / 100) * 360 >= PROFESSIONAL_CAPTURE_CONFIG.REQUIRED_COVERAGE_DEG;
  const statusText =
    !isPhoneLevel        ? "⚠️ Keep phone level" :
    isDone               ? "✓ Ready — Generate Panorama" :
    isNearCompletion     ? `${capturedFrames}/${targetFrames} frames — Almost done!` :
    isMoving             ? `Capturing... ${capturedFrames}/${targetFrames}` :
                           "Hold steady and rotate slowly";

  const statusColor =
    !isPhoneLevel        ? "#ef4444" :
    isDone               ? "#86efac" :
    isNearCompletion     ? "#a78bfa" :
    isMoving             ? "#f8fafc" :
                           "#6ee7b7";

  const statusBg =
    !isPhoneLevel        ? "rgba(239,68,68,0.25)" :
    isDone               ? "rgba(34,197,94,0.25)" :
    isNearCompletion     ? "rgba(139,92,246,0.25)" :
    isMoving             ? "rgba(0,0,0,0.50)"      :
                           "rgba(0,0,0,0.65)";

  return (
    <div style={{ position: "relative", display: "inline-block", width: "100%", maxWidth: "360px" }}>
      <video
        ref={videoRef}
        autoPlay playsInline muted
        style={{ width: "100%", display: "block", borderRadius: "12px", background: "#000" }}
      />

      <div style={{
        position: "absolute", inset: 0,
        pointerEvents: "none", borderRadius: "12px", overflow: "hidden",
      }}>

        {/* ── Transparent rectangle around dashed line (like reference image) ── */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: "90px",
          transform: "translateY(-50%)",
          background: "rgba(0,0,0,0.45)",
          borderTop: "1px solid rgba(255,255,255,0.15)",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          pointerEvents: "none",
        }} />

        {/* ── Dashed white center line with glow ── */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "5%",
          right: "5%",
          height: "2px",
          transform: "translateY(-50%)",
          background: `repeating-linear-gradient(
            to right,
            rgba(255,255,255,0.9) 0px,
            rgba(255,255,255,0.9) 12px,
            transparent 12px,
            transparent 22px
          )`,
          boxShadow: "0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.2)",
          borderRadius: "1px",
        }} />

        {/* ── Level indicator (shows if phone is tilted) ── */}
        {!isPhoneLevel && (
          <div style={{
            position: "absolute",
            top: `calc(50% + ${tiltPx}px)`,
            left: "50%",
            transform: "translateX(-50%)",
            width: "60px",
            height: "4px",
            background: "rgba(239,68,68,0.8)",
            borderRadius: "2px",
            boxShadow: "0 0 10px rgba(239,68,68,0.6)",
            transition: "top 0.2s ease-out",
          }} />
        )}

        {/* ── Arrow (smooth movement based on yaw and pitch/roll) ── */}
        <div
          onClick={undefined}
          style={{
            position: "absolute",
            top: `calc(50% + ${displayTilt}px)`,
            left: `${displayLeft}%`,
            transform: "translate(-50%, -50%)",
            display: "flex",
            alignItems: "center",
            willChange: "top, left",
            filter: !isPhoneLevel
              ? "drop-shadow(0 0 12px rgba(239,68,68,0.9)) drop-shadow(0 2px 6px rgba(0,0,0,0.5))"
              : isAligned
                ? "drop-shadow(0 0 8px rgba(255,255,255,0.8)) drop-shadow(0 2px 6px rgba(0,0,0,0.5))"
                : "drop-shadow(0 0 12px rgba(245,158,11,0.9)) drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
          }}
        >
          {/* Arrow body */}
          <div style={{
            width: "52px",
            height: "26px",
            background: arrowColor,
            borderRadius: "4px 0 0 4px",
            transition: "background 0.25s",
          }} />
          {/* Arrow head */}
          <div style={{
            width: 0, height: 0,
            borderTop: "26px solid transparent",
            borderBottom: "26px solid transparent",
            borderLeft: `32px solid ${arrowColor}`,
            transition: "border-left-color 0.25s",
          }} />
          {/* Highlight shine */}
          <div style={{
            position: "absolute",
            top: "3px", left: "5px",
            width: "44px", height: "5px",
            background: "rgba(255,255,255,0.35)",
            borderRadius: "3px",
            pointerEvents: "none",
          }} />
        </div>

        {/* ── Frame counter (top-left) ── */}
        {capturedFrames > 0 && (
          <div style={{
            position: "absolute",
            top: "14px", left: "14px",
            background: "rgba(0,0,0,0.75)",
            color: frameProgress >= 1 ? "#86efac" : "#93c5fd",
            fontSize: "12px", fontWeight: 700,
            padding: "5px 12px", borderRadius: "20px",
            border: `2px solid ${frameProgress >= 1 ? "#22c55e" : "#3b82f6"}`,
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}>
            📸 {capturedFrames}/{targetFrames}
          </div>
        )}

        {/* ── Status pill ── */}
        <div style={{
          position: "absolute",
          top: "calc(50% + 56px)",
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
        }}>
          <span style={{
            background: statusBg,
            color: statusColor,
            fontSize: "13px", fontWeight: 600,
            padding: "7px 16px", borderRadius: "999px",
            backdropFilter: "blur(8px)",
            border: `1.5px solid ${statusColor}55`,
            boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
            transition: "color 0.2s, background 0.2s",
          }}>
            {statusText}
          </span>
        </div>

        {/* ── Coverage progress bar (bottom) ── */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: "5px",
          background: "rgba(0,0,0,0.4)",
          borderRadius: "0 0 12px 12px",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${coverage}%`,
            background: isNearCompletion
              ? "linear-gradient(90deg, #22c55e, #16a34a)"
              : coverage >= 50
                ? "linear-gradient(90deg, #3b82f6, #1d4ed8)"
                : "linear-gradient(90deg, #6366f1, #4f46e5)",
            transition: "width 0.4s ease, background 0.3s ease",
            boxShadow: "0 0 6px rgba(59,130,246,0.4)",
          }} />
          {/* Target line marker */}
          <div style={{
            position: "absolute",
            left: `${(PROFESSIONAL_CAPTURE_CONFIG.REQUIRED_COVERAGE_DEG / 360) * 100}%`,
            top: 0, bottom: 0, width: "2px",
            background: "#fbbf24",
            boxShadow: "0 0 4px rgba(251,191,36,0.8)",
          }} />
        </div>

        {/* ── Coverage % label (bottom-right) ── */}
        <div style={{
          position: "absolute",
          bottom: "10px", right: "10px",
          background: "rgba(0,0,0,0.75)",
          color: isNearCompletion ? "#86efac" : coverage >= 50 ? "#93c5fd" : "#c4b5fd",
          fontSize: "11px", fontWeight: 700,
          padding: "3px 10px", borderRadius: "999px",
          border: `1px solid ${isNearCompletion ? "#22c55e" : coverage >= 50 ? "#3b82f6" : "#8b5cf6"}`,
          backdropFilter: "blur(8px)",
        }}>
          {coverage.toFixed(0)}% / {PROFESSIONAL_CAPTURE_CONFIG.REQUIRED_COVERAGE_DEG}°
        </div>

        {/* ── Wrong direction warning ── */}
        {isDirectionWrong && (
          <div style={{
            position: "absolute",
            top: "12px", left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(239,68,68,0.95)",
            color: "#fff",
            fontSize: "12px", fontWeight: 600,
            padding: "7px 14px", borderRadius: "999px",
            whiteSpace: "nowrap",
            border: "1.5px solid rgba(255,255,255,0.3)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 12px rgba(239,68,68,0.4)",
            animation: "warningPulse 1.5s ease-in-out infinite",
          }}>
            ⚠️ Wrong direction
          </div>
        )}

        {/* ── Pulse dot when still + aligned ── */}
        {!isMoving && !isDone && isAligned && (
          <div style={{
            position: "absolute",
            top: "calc(50% + 88px)",
            left: "50%",
            transform: "translateX(-50%)",
          }}>
            <div style={{
              width: "10px", height: "10px", borderRadius: "50%",
              background: "radial-gradient(circle, #6ee7b7 0%, #22c55e 100%)",
              animation: "scanPulse 1.2s ease-in-out infinite",
              boxShadow: "0 0 14px rgba(34,197,94,0.6)",
            }} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes warningPulse {
          0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
          50%       { opacity: 0.8; transform: translateX(-50%) scale(1.02); }
        }
      `}</style>
    </div>
  );
};
