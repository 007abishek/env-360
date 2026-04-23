import { useEffect, useState } from "react";

export const useOrientation = () => {
  const [orientation, setOrientation] = useState({
    yaw: 0,
    pitch: 0,
    roll: 0,
    hasOrientation: false,
  });

  useEffect(() => {
    // Request permission on iOS 13+
    const requestPermission = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission !== 'granted') {
            console.warn('Device orientation permission denied');
            return false;
          }
        } catch (error) {
          console.error('Error requesting device orientation permission:', error);
          return false;
        }
      }
      return true;
    };

    const handler = (e: DeviceOrientationEvent) => {
      // Log raw values for debugging (but not too frequently)
      if (Math.random() < 0.1) { // Log ~10% of events to avoid spam
        console.log('DeviceOrientation:', { alpha: e.alpha, beta: e.beta, gamma: e.gamma });
      }
      
      setOrientation((previous) => {
        const newOrientation = {
          yaw: e.alpha ?? previous.yaw,
          pitch: e.beta ?? previous.pitch,
          roll: e.gamma ?? previous.roll,
          hasOrientation: e.alpha !== null || e.beta !== null || e.gamma !== null,
        };
        
        // Log significant yaw changes
        if (Math.abs(newOrientation.yaw - previous.yaw) > 5) {
          console.log(`📱 Yaw change: ${previous.yaw.toFixed(1)}° → ${newOrientation.yaw.toFixed(1)}°`);
        }
        
        return newOrientation;
      });
    };

    requestPermission().then((granted) => {
      if (granted) {
        console.log('📱 Device orientation permission granted, adding listener');
        window.addEventListener("deviceorientation", handler);
      } else {
        console.log('📱 Device orientation permission denied or not available');
      }
    });

    return () => {
      console.log('📱 Removing device orientation listener');
      window.removeEventListener("deviceorientation", handler);
    };
  }, []);

  return orientation;
};
