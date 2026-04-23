import type { TurnDirection } from "../types/scan";

// Professional capture parameters based on specifications
export const PROFESSIONAL_CAPTURE_CONFIG = {
  // Frame parameters - OPTIMAL FOR 360°
  MIN_FRAMES: 30,
  MAX_FRAMES: 45,
  TARGET_FRAMES: 36,
  
  // Angle parameters  
  MIN_ANGLE_STEP_DEG: 20,
  MAX_ANGLE_STEP_DEG: 30,
  IDEAL_ANGLE_STEP_DEG: 24,
  
  // Overlap parameters
  MIN_OVERLAP_PERCENT: 30,
  MAX_OVERLAP_PERCENT: 50,
  IDEAL_OVERLAP_PERCENT: 40,
  
  // Completion parameters
  REQUIRED_COVERAGE_DEG: 330, // 330° completion
  FULL_ROTATION_DEG: 360,
  
  // Speed constraints
  MIN_ROTATION_SPEED_DEG_PER_SEC: 10,
  MAX_ROTATION_SPEED_DEG_PER_SEC: 30,
  IDEAL_ROTATION_SPEED_DEG_PER_SEC: 20,
  
  // Tilt constraints
  MAX_TILT_DEG: 10,
  
  // Filtering
  BLUR_THRESHOLD: 0.1,
  DUPLICATE_THRESHOLD: 0.95,
  TILT_FILTER_ENABLED: true,
  
  // Capture method
  CAPTURE_METHOD: 'angle-based' as const,
  DIRECTION_MODE: 'single' as const,
  ROTATION_AXIS: 'yaw-only' as const,
};

export const DUPLICATE_THRESHOLD = 8;
export const REQUIRED_COVERAGE = 80;
// Professional capture timing based on research paper
// "VideoCapture object is created to capture the live stream from the video file and every frame is included in the stream"
export const CAPTURE_INTERVAL_MS = 800; // Capture every 800ms — slower rotation for better quality
export const MIN_SCAN_DURATION_SECONDS = 15; // Faster completion
export const MAX_SCAN_DURATION_SECONDS = 180;
// Key frame selection parameters
export const MIN_MOTION_THRESHOLD = 2.0; // Minimum motion for frame consideration
export const MAX_SIMILARITY_THRESHOLD = 0.85; // Maximum similarity to avoid duplicates
export const MAX_ANGULAR_JUMP_DEG = 70;
export const MAX_ROTATION_SPEED_DEG_PER_SEC = 24;
export const MIN_DIRECTIONAL_DELTA_DEG = 6;
export const MAX_DIRECTION_FLIP_STREAK = 2;
export const OSCILLATION_WINDOW = 6;
export const MAX_OSCILLATION_NET_DEG = 40;
export const MIN_UPRIGHT_PITCH_DEG = 55;
export const MAX_UPRIGHT_PITCH_DEG = 125;
export const MAX_ALLOWED_ROLL_DEG = 25;
export const DEFAULT_START_DIRECTION: TurnDirection = -1;
export const PANORAMA_LEVEL_TARGET_PITCH_DEG = 90;
export const PANORAMA_LEVEL_MAX_PITCH_DRIFT_DEG = 14;
export const PANORAMA_LEVEL_MAX_ROLL_DRIFT_DEG = 12;
export const PANORAMA_LEVEL_MAX_COMBINED_DRIFT_DEG = 16;
