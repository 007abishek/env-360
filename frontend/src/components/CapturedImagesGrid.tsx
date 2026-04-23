import type { CapturePreview } from "../types/scan";
import { formatTimestamp } from "../utils/scanHelpers";

type CapturedImagesGridProps = {
  captures: CapturePreview[];
};

export const CapturedImagesGrid = ({ captures }: CapturedImagesGridProps) => {
  if (captures.length === 0) return null;

  return (
    <div style={{ marginTop: "20px" }}>
      <h3 style={{ marginBottom: "12px" }}>Captured Images</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {captures.map((capture) => (
          <div
            key={capture.id}
            style={{
              position: "relative",
              borderRadius: "14px",
              overflow: "hidden",
              border: "1px solid #1f3a66",
              background: "linear-gradient(170deg, rgba(28,48,78,0.9), rgba(2,8,22,0.95))",
              boxShadow: "0 8px 26px rgba(0, 0, 0, 0.35)",
            }}
          >
            <img
              src={capture.src}
              alt={`Capture ${capture.id}`}
              style={{ width: "100%", height: "140px", objectFit: "cover", display: "block" }}
            />
            <div
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                width: "26px",
                height: "26px",
                borderRadius: "999px",
                background: "#2563eb",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              {capture.id}
            </div>
            <div style={{ padding: "10px", textAlign: "left" }}>
              <div style={{ fontWeight: 700 }}>{formatTimestamp(capture.timestampSec)}</div>
              <div style={{ color: "#b8c7ea", fontSize: "14px" }}>{capture.direction}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
