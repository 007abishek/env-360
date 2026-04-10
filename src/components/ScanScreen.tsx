import type { RefObject } from "react";
import "../lib/aframe";
import { segmentToYaw } from "../utils/directionalGuidance";
import { DirectionalGuidance3D } from "./DirectionalGuidance3D";

export const ScanScreen = ({
  videoRef,
  coverage,
  yaw,
  showPostureWarning,
  lockedDirection,
  isDirectionWrong,
  invertHorizontal,
  coveredSegments: _coveredSegments,
  segmentSize,
  targetSegment,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  coverage: number;
  yaw: number;
  showPostureWarning: boolean;
  lockedDirection: -1 | 0 | 1;
  isDirectionWrong: boolean;
  invertHorizontal: boolean;
  coveredSegments: number[];
  segmentSize: number;
  targetSegment: number;
}) => {
  const targetYaw = targetSegment >= 0 ? segmentToYaw(targetSegment, segmentSize) : yaw;

  return (
    <div style={{ position: "relative", textAlign: "center" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          maxWidth: "320px",
          borderRadius: "10px",
          background: "black",
        }}
      />

      {showPostureWarning && (
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "320px",
            height: "100%",
            borderRadius: "10px",
            background: "rgba(2, 6, 23, 0.76)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "14px",
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: "100%",
              borderRadius: "14px",
              padding: "14px 12px",
              background: "rgba(15, 23, 42, 0.92)",
              border: "1px solid rgba(239, 68, 68, 0.6)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.45)",
            }}
          >
            <div style={{ fontWeight: 700, color: "#f8fafc", marginBottom: "8px", fontSize: "15px" }}>
              Keep phone perpendicular
            </div>
            <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.4 }}>
              Wrong angle detected. Hold straight portrait and rotate only in yaw for full 360 capture.
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: "0",
          left: "50%",
          width: "100%",
          maxWidth: "320px",
          height: "180px",
          transform: "translateX(-50%)",
          borderRadius: "10px",
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <DirectionalGuidance3D
          currentYaw={yaw}
          targetYaw={targetYaw}
          lockedDirection={lockedDirection}
          isDirectionWrong={isDirectionWrong}
          invertHorizontal={invertHorizontal}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: "0",
          left: "50%",
          width: "100%",
          maxWidth: "320px",
          transform: "translateX(-50%)",
          background: "rgba(17, 24, 39, 0.55)",
          color: "#f8fafc",
          fontSize: "14px",
          fontWeight: 600,
          padding: "8px 10px",
          backdropFilter: "blur(2px)",
          borderTopLeftRadius: "10px",
          borderTopRightRadius: "10px",
          pointerEvents: "none",
        }}
      >
        360 degree view guidance
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "72%",
          transform: "translateX(-50%)",
          background: "rgba(31, 41, 55, 0.75)",
          color: "#f8fafc",
          padding: "6px 12px",
          borderRadius: "8px",
          fontSize: "13px",
          pointerEvents: "none",
        }}
      >
        Follow the 3D arrow guide
      </div>

      <h3>Coverage: {coverage.toFixed(0)}%</h3>
      <p>Move camera around the room</p>
    </div>
  );
};
