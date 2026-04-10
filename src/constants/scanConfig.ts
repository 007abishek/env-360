import type { TurnDirection } from "../types/scan";

export const DUPLICATE_THRESHOLD = 8;
export const REQUIRED_COVERAGE = 80;
export const CAPTURE_INTERVAL_MS = 2000;
export const MIN_SCAN_DURATION_SECONDS = 20;
export const MAX_SCAN_DURATION_SECONDS = 180;
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
