import { useEffect, useRef, useState } from "react";

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [isBackCamera, setIsBackCamera] = useState(true);
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [isLoading, setIsLoading] = useState(false);

  // Check camera permissions
  const checkPermissions = async () => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissionState(permission.state);
        console.log('🎥 Camera permission state:', permission.state);
        
        permission.addEventListener('change', () => {
          setPermissionState(permission.state);
          console.log('🎥 Camera permission changed to:', permission.state);
        });
        
        return permission.state;
      }
    } catch (err) {
      console.warn('⚠️ Could not check camera permissions:', err);
    }
    return 'unknown';
  };

  // Get user-friendly error messages
  const getPermissionGuidance = (error: any): string => {
    const errorName = error?.name || '';
    const errorMessage = error?.message || '';
    
    console.log('🎥 Camera error details:', { name: errorName, message: errorMessage, error });
    
    if (errorName === 'NotAllowedError' || errorMessage.includes('Permission denied')) {
      return `Camera access blocked. Please:
      
1. Click the camera icon in your browser's address bar
2. Select "Allow" for camera access
3. Refresh the page and try again

Or check your browser settings:
• Chrome: Settings → Privacy → Site Settings → Camera
• Safari: Settings → Websites → Camera
• Firefox: Settings → Privacy → Permissions → Camera`;
    }
    
    if (errorName === 'NotFoundError') {
      return 'No camera found. Please connect a camera and try again.';
    }
    
    if (errorName === 'NotReadableError') {
      return 'Camera is being used by another app. Please close other camera apps and try again.';
    }
    
    if (errorName === 'OverconstrainedError') {
      return 'Camera constraints not supported. Trying with basic settings...';
    }
    
    if (errorName === 'SecurityError') {
      return 'Camera access blocked by security policy. Please use HTTPS or localhost.';
    }
    
    return `Camera error: ${errorMessage || 'Unknown error'}. Please check your camera permissions and try again.`;
  };

  const attachStreamToVideo = async () => {
    console.log('🎥 Attaching stream to video element...')
    if (!videoRef.current || !streamRef.current) {
      console.error('❌ Missing video element or stream')
      return;
    }

    videoRef.current.srcObject = streamRef.current;
    videoRef.current.setAttribute("playsinline", "true");
    videoRef.current.setAttribute("webkit-playsinline", "true");
    videoRef.current.muted = true;

    try {
      await videoRef.current.play();
      console.log('✅ Video playback started')
    } catch (playErr) {
      console.warn("⚠️ Video play warning:", playErr);
      // Try to play again after a short delay
      setTimeout(async () => {
        try {
          if (videoRef.current) {
            await videoRef.current.play();
            console.log('✅ Video playback started (retry)')
          }
        } catch (retryErr) {
          console.error('❌ Video play retry failed:', retryErr);
        }
      }, 100);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsLoading(false);
  };

  const startCamera = async () => {
    console.log('🎥 Starting camera...')
    setIsLoading(true);
    setCameraError("");

    // Check permissions first
    await checkPermissions();
    
    if (!window.isSecureContext) {
      const message = "Camera requires HTTPS or localhost. Please use a secure connection.";
      console.error('❌ Security context error:', message)
      setCameraError(message);
      setIsLoading(false);
      throw new Error(message);
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      const message = "Camera not supported in this browser. Please use Chrome, Safari, or Firefox.";
      console.error('❌ MediaDevices not supported:', message)
      setCameraError(message);
      setIsLoading(false);
      throw new Error(message);
    }

    // Try different camera configurations with better error handling
    const cameraConfigs = [
      // Try back camera first (best for panoramas)
      { 
        video: { 
          facingMode: { exact: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false,
        description: 'back camera (exact)'
      },
      // Fallback to ideal back camera
      { 
        video: { 
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false,
        description: 'back camera (ideal)'
      },
      // Try any camera with good resolution
      { 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false,
        description: 'any camera (high res)'
      },
      // Basic camera access
      { 
        video: true, 
        audio: false,
        description: 'any camera (basic)'
      }
    ];

    let lastError: any = null;
    
    for (const config of cameraConfigs) {
      try {
        console.log(`🎥 Trying ${config.description}...`);
        const stream = await navigator.mediaDevices.getUserMedia(config);
        
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        const facingMode = settings.facingMode;
        
        setIsBackCamera(facingMode === "environment");
        console.log('✅ Camera acquired:', {
          facingMode,
          width: settings.width,
          height: settings.height,
          deviceId: settings.deviceId
        });
        
        await attachStreamToVideo();
        setIsLoading(false);
        console.log('✅ Camera stream attached successfully');
        return; // Success!
        
      } catch (err) {
        console.warn(`⚠️ ${config.description} failed:`, err);
        lastError = err;
        continue; // Try next config
      }
    }

    // All configurations failed
    const guidance = getPermissionGuidance(lastError);
    console.error('❌ All camera configurations failed:', lastError);
    setCameraError(guidance);
    setIsLoading(false);
    throw new Error(guidance);
  };

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return {
    videoRef,
    cameraError,
    isBackCamera,
    startCamera,
    attachStreamToVideo,
    stopCamera,
    setCameraError,
    permissionState,
    isLoading,
    checkPermissions,
  };
};
