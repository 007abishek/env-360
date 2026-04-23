export const PanoramaViewer = ({ image }: { image: string }) => {
  return (
    <div style={{ marginTop: "16px" }}>
      <h3>Stitched Panorama Image</h3>
      <div
        style={{
          width: "100%",
          maxWidth: "1000px",
          margin: "0 auto",
          borderRadius: "10px",
          border: "1px solid #1f3a66",
          overflow: "hidden",
          background: "#0b1220",
        }}
      >
        <img
          src={image}
          alt="Stitched panorama"
          style={{
            width: "100%",
            height: "auto",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
      <p style={{ color: "#b8c7ea", fontSize: "14px", marginTop: "8px" }}>
        Panorama generated as a flat stitched image (no 3D viewer).
      </p>
    </div>
  );
};
