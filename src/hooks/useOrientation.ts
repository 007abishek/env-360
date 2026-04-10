import { useEffect, useState } from "react";

export const useOrientation = () => {
  const [orientation, setOrientation] = useState({
    yaw: 0,
    pitch: 0,
    roll: 0,
  });

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      setOrientation((previous) => ({
        yaw: e.alpha ?? previous.yaw,
        pitch: e.beta ?? previous.pitch,
        roll: e.gamma ?? previous.roll,
      }));
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, []);

  return orientation;
};
