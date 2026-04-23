export const AFrameInstructions = () => {
  const steps = [
    "Tap Start Scan",
    "Rotate slowly — keep arrow on the line",
    "Complete full 360° coverage",
    "Keep one smooth direction (20–180 sec)",
    "Tap Generate Panorama",
  ];

  return (
    <div style={{
      width: "100%",
      maxWidth: "360px",
      margin: "0 auto 16px auto",
      background: "rgba(15,23,42,0.7)",
      border: "1px solid rgba(96,165,250,0.2)",
      borderRadius: "10px",
      padding: "12px 16px",
      textAlign: "left",
    }}>
      <p style={{ color: "#93c5fd", fontWeight: 600, margin: "0 0 8px", fontSize: "13px" }}>
        Scan Instructions
      </p>
      {steps.map((s, i) => (
        <p key={i} style={{ color: "#e2e8f0", margin: "4px 0", fontSize: "12px" }}>
          {i + 1}. {s}
        </p>
      ))}
    </div>
  );
};
