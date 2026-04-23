/**
 * Panorama Stitching Configuration
 * 
 * Adjust these values to tune the panorama capture and stitching behavior
 */

export const PANORAMA_CONFIG = {
  // ── Capture Settings ────────────────────────────────────────────────────────
  
  /** Interval between frame captures (milliseconds) */
  CAPTURE_INTERVAL_MS: 500,
  
  /** Maximum number of frames to capture */
  MAX_FRAMES: 15,
  
  /** JPEG quality for captured frames (0.0 - 1.0) */
  FRAME_QUALITY: 0.92,
  
  /** Maximum width for captured frames (null = use native resolution) */
  MAX_FRAME_WIDTH: null as number | null,
  
  // ── Key-Frame Selection ─────────────────────────────────────────────────────
  
  /** Minimum yaw difference between frames (degrees) */
  MIN_YAW_STEP: 5.0,
  
  /** Enable key-frame filtering */
  ENABLE_KEY_FRAME_FILTER: true,
  
  // ── Feature Detection ───────────────────────────────────────────────────────
  
  /** Number of features to detect per frame */
  MAX_FEATURES: 1000,
  
  /** Feature detector type ('ORB' or 'SIFT' if available) */
  DETECTOR_TYPE: 'ORB' as 'ORB' | 'SIFT',
  
  // ── Feature Matching ────────────────────────────────────────────────────────
  
  /** Lowe's ratio test threshold (lower = stricter matching) */
  LOWE_RATIO: 0.75,
  
  /** Minimum number of matches required for valid homography */
  MIN_MATCHES: 4,
  
  // ── Homography Estimation ───────────────────────────────────────────────────
  
  /** RANSAC reprojection threshold (pixels) */
  RANSAC_THRESHOLD: 4.0,
  
  /** Maximum RANSAC iterations */
  RANSAC_MAX_ITERS: 500,
  
  /** Minimum inliers for valid homography */
  MIN_INLIERS: 4,
  
  // ── Blending ────────────────────────────────────────────────────────────────
  
  /** Default blend mode */
  DEFAULT_BLEND_MODE: 'linear' as 'linear' | 'laplacian',
  
  /** Alpha value for linear blending (0.0 - 1.0) */
  BLEND_ALPHA: 0.5,
  
  /** Number of pyramid levels for multi-band blending */
  PYRAMID_LEVELS: 4,
  
  // ── Visual Feedback ─────────────────────────────────────────────────────────
  
  /** Show ghost frame overlay during capture */
  SHOW_GHOST_FRAME: true,
  
  /** Ghost frame opacity (0.0 - 1.0) */
  GHOST_OPACITY: 0.5,
  
  /** Show frame counter during capture */
  SHOW_FRAME_COUNTER: true,
  
  /** Show progress messages during stitching */
  SHOW_PROGRESS: true,
  
  // ── Performance ─────────────────────────────────────────────────────────────
  
  /** Enable Web Worker for stitching (recommended) */
  USE_WEB_WORKER: true,
  
  /** OpenCV.js path (relative to public folder or CDN URL) */
  OPENCV_PATH: '/opencv.js',
  
  /** Timeout for OpenCV initialization (milliseconds) */
  OPENCV_INIT_TIMEOUT: 30000,
  
  // ── Mobile Optimizations ────────────────────────────────────────────────────
  
  /** Reduce max frames on mobile devices */
  MOBILE_MAX_FRAMES: 10,
  
  /** Reduce frame quality on mobile devices */
  MOBILE_FRAME_QUALITY: 0.85,
  
  /** Maximum frame width on mobile devices */
  MOBILE_MAX_FRAME_WIDTH: 1280,
  
  /** Auto-detect mobile and apply optimizations */
  AUTO_MOBILE_OPTIMIZATION: true,
}

/**
 * Get configuration with mobile optimizations applied if needed
 */
export function getPanoramaConfig() {
  const config = { ...PANORAMA_CONFIG }
  
  if (config.AUTO_MOBILE_OPTIMIZATION && isMobileDevice()) {
    config.MAX_FRAMES = config.MOBILE_MAX_FRAMES
    config.FRAME_QUALITY = config.MOBILE_FRAME_QUALITY
    config.MAX_FRAME_WIDTH = config.MOBILE_MAX_FRAME_WIDTH
  }
  
  return config
}

/**
 * Detect if running on mobile device
 */
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Preset configurations for different use cases
 */
export const PANORAMA_PRESETS = {
  /** Fast capture, lower quality (good for testing) */
  FAST: {
    ...PANORAMA_CONFIG,
    CAPTURE_INTERVAL_MS: 300,
    MAX_FRAMES: 8,
    FRAME_QUALITY: 0.85,
    MAX_FEATURES: 500,
  },
  
  /** Balanced quality and performance (recommended) */
  BALANCED: {
    ...PANORAMA_CONFIG,
    CAPTURE_INTERVAL_MS: 500,
    MAX_FRAMES: 12,
    FRAME_QUALITY: 0.92,
    MAX_FEATURES: 1000,
  },
  
  /** High quality, slower (best results) */
  HIGH_QUALITY: {
    ...PANORAMA_CONFIG,
    CAPTURE_INTERVAL_MS: 700,
    MAX_FRAMES: 15,
    FRAME_QUALITY: 0.95,
    MAX_FEATURES: 1500,
    MIN_YAW_STEP: 4.0,
    LOWE_RATIO: 0.7,
  },
  
  /** Mobile optimized */
  MOBILE: {
    ...PANORAMA_CONFIG,
    CAPTURE_INTERVAL_MS: 500,
    MAX_FRAMES: 10,
    FRAME_QUALITY: 0.85,
    MAX_FRAME_WIDTH: 1280,
    MAX_FEATURES: 800,
  },
} as const

export type PanoramaPreset = keyof typeof PANORAMA_PRESETS
