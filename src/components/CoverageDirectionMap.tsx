type CoverageDirectionMapProps = {
  coveredSegments: number[];
  segmentSize: number;
};

const toDirection = (angle: number) => {
  const normalized = ((angle % 360) + 360) % 360;
  const directions = [
    "Front",
    "Front-Right",
    "Right",
    "Back-Right",
    "Back",
    "Back-Left",
    "Left",
    "Front-Left",
  ];
  const index = Math.round(normalized / 45) % directions.length;
  return directions[index];
};

export const CoverageDirectionMap = ({
  coveredSegments,
  segmentSize,
}: CoverageDirectionMapProps) => {
  const totalSegments = Math.floor(360 / segmentSize);
  const coveredSet = new Set(coveredSegments);

  return (
    <div style={{ marginTop: "14px" }}>
      <h3 style={{ marginBottom: "10px" }}>Direction Coverage</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "8px",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {Array.from({ length: totalSegments }, (_, seg) => {
          const start = seg * segmentSize;
          const end = start + segmentSize - 1;
          const center = start + segmentSize / 2;
          const isCovered = coveredSet.has(seg);

          return (
            <div
              key={seg}
              style={{
                borderRadius: "10px",
                border: isCovered ? "1px solid #34d399" : "1px solid #334155",
                background: isCovered ? "rgba(16, 185, 129, 0.15)" : "rgba(15, 23, 42, 0.8)",
                padding: "8px 10px",
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 700, color: isCovered ? "#6ee7b7" : "#e2e8f0" }}>
                {toDirection(center)}
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                {start}Â°-{end}Â°
              </div>
              <div style={{ fontSize: "12px", marginTop: "2px", color: isCovered ? "#6ee7b7" : "#f59e0b" }}>
                {isCovered ? "Covered" : "Pending"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
