export type TurnHint = "left" | "right" | "hold";
export type GuidanceStatus = "correct" | "wrong" | "hold" | "too_fast";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const normalizeYaw = (yaw: number) => ((yaw % 360) + 360) % 360;

export const shortestAngleDiff = (target: number, current: number) =>
  ((((target - current) % 360) + 540) % 360) - 180;

export type DirectionalGuidanceInput = {
  currentYaw: number;
  targetYaw: number;
  previousYaw: number | null;
  toleranceDeg?: number;
  minMovementDeg?: number;
  maxMovementDeg?: number;
  invertHorizontal?: boolean;
};

export type DirectionalGuidanceState = {
  instruction: string;
  targetDelta: number;
  targetReached: boolean;
  turnHint: TurnHint;
  status: GuidanceStatus;
  arrowX: number;
  arrowColor: string;
  movementDetected: boolean;
  movementTooFast: boolean;
  movingDirection: "left" | "right" | null;
};

export const getDirectionalGuidance = ({
  currentYaw,
  targetYaw,
  previousYaw,
  toleranceDeg = 10,
  minMovementDeg = 0.8,
  maxMovementDeg = 12,
  invertHorizontal = false,
}: DirectionalGuidanceInput): DirectionalGuidanceState => {
  const normalizedCurrent = normalizeYaw(currentYaw);
  const normalizedTarget = normalizeYaw(targetYaw);
  const targetDelta = shortestAngleDiff(normalizedTarget, normalizedCurrent);
  const distance = Math.abs(targetDelta);

  if (distance <= toleranceDeg) {
    return {
      instruction: "Hold steady",
      targetDelta,
      targetReached: true,
      turnHint: "hold",
      status: "hold",
      arrowX: 0,
      arrowColor: "#22c55e",
      movementDetected: false,
      movementTooFast: false,
      movingDirection: null,
    };
  }

  const rawTurnHint: TurnHint = targetDelta > 0 ? "right" : "left";
  const turnHint: TurnHint =
    invertHorizontal ? (rawTurnHint === "right" ? "left" : "right") : rawTurnHint;
  const directionSign = turnHint === "right" ? 1 : -1;
  const arrowX = directionSign * (0.34 + 0.72 * clamp(distance / 180, 0, 1));

  let status: GuidanceStatus = "correct";
  let movementDetected = false;
  let movementTooFast = false;
  let movingDirection: "left" | "right" | null = null;
  if (previousYaw !== null) {
    const movementDelta = shortestAngleDiff(normalizedCurrent, normalizeYaw(previousYaw));
    const movementMagnitude = Math.abs(movementDelta);
    if (movementMagnitude > maxMovementDeg) {
      movementDetected = true;
      movementTooFast = true;
      status = "too_fast";
    } else if (movementMagnitude >= minMovementDeg) {
      movementDetected = true;
      const movingRight = movementDelta > 0;
      movingDirection = movingRight ? "right" : "left";
      status =
        (movingRight && turnHint === "right") || (!movingRight && turnHint === "left")
          ? "correct"
          : "wrong";
    }
  }

  const arrowColor =
    status === "wrong" ? "#ef4444" : status === "too_fast" ? "#f59e0b" : "#22c55e";

  return {
    instruction:
      status === "too_fast"
        ? "Move slowly"
        : turnHint === "right"
          ? "-> Turn Right"
          : "<- Turn Left",
    targetDelta,
    targetReached: false,
    turnHint,
    status,
    arrowX,
    arrowColor,
    movementDetected,
    movementTooFast,
    movingDirection,
  };
};
