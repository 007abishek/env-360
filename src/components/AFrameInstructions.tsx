import "../lib/aframe";

export const AFrameInstructions = () => {
  return (
    <div style={{ width: "100%", maxWidth: "900px", margin: "0 auto 16px auto", borderRadius: "10px", overflow: "hidden" }}>
      <a-scene
        embedded
        vr-mode-ui="enabled: false"
        xr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
        style={{ width: "100%", height: "220px", background: "#08101f" }}
      >
        <a-entity position="0 1.6 -3" text="value: Scan Instructions; align: center; color: #93c5fd; width: 5" />
        <a-entity position="0 1.1 -3" text="value: 1) Tap Start Scan; align: center; color: #e2e8f0; width: 6" />
        <a-entity position="0 0.8 -3" text="value: 2) Rotate slowly every 30 degrees; align: center; color: #e2e8f0; width: 6" />
        <a-entity position="0 0.5 -3" text="value: 3) Reach full 100 percent 360 coverage; align: center; color: #e2e8f0; width: 6" />
        <a-entity position="0 0.2 -3" text="value: 4) Keep one smooth direction for 20 to 180 seconds; align: center; color: #e2e8f0; width: 6" />
        <a-entity position="0 -0.1 -3" text="value: 5) Tap Generate Panorama; align: center; color: #e2e8f0; width: 6" />
        <a-sky color="#0b1220" />
        <a-entity camera look-controls-enabled="false" />
      </a-scene>
    </div>
  );
};
