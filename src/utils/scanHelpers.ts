import type { TurnDirection } from "../types/scan";

export const getSegmentFromYaw = (value: number, segmentSize: number) => {
  const normalized = ((value % 360) + 360) % 360;
  return Math.floor(normalized / segmentSize);
};

export const isPerpendicularPortrait = (
  pitchValue: number,
  rollValue: number,
  minPitchDeg: number,
  maxPitchDeg: number,
  maxRollDeg: number
) => {
  const pitchAbs = Math.abs(pitchValue);
  const rollAbs = Math.abs(rollValue);
  const pitchUpright = pitchAbs >= minPitchDeg && pitchAbs <= maxPitchDeg;
  const rollUpright = rollAbs <= maxRollDeg;
  return pitchUpright && rollUpright;
};

export const getNextTargetSegment = (
  yaw: number,
  segmentSize: number,
  totalSegments: number,
  coveredSegments: Set<number>,
  lockedDirection: TurnDirection,
  defaultDirection: TurnDirection
) => {
  const currentSegment = getSegmentFromYaw(yaw, segmentSize);
  const direction = lockedDirection === 0 ? defaultDirection : lockedDirection;

  for (let offset = 0; offset < totalSegments; offset += 1) {
    const candidate =
      direction > 0
        ? (currentSegment + offset) % totalSegments
        : (currentSegment - offset + totalSegments) % totalSegments;
    if (!coveredSegments.has(candidate)) {
      return candidate;
    }
  }

  return -1;
};

export const getDirectionFromYaw = (value: number) => {
  const normalized = ((value % 360) + 360) % 360;
  const directions = [
    "Front",
    "Front-Right",
    "Right",
    "Back-Right",
    "Back",
    "Back-Left",
    "Left",
    "Front-Left",
  ];
  const index = Math.round(normalized / 45) % directions.length;
  return directions[index];
};

export const getMissingSegments = (totalSegments: number, coveredSegments: Set<number>) => {
  const missing: number[] = [];
  for (let segment = 0; segment < totalSegments; segment += 1) {
    if (!coveredSegments.has(segment)) {
      missing.push(segment);
    }
  }
  return missing;
};

export const formatTimestamp = (totalSeconds: number) => {
  const seconds = Math.max(0, totalSeconds);
  const minutesPart = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secondsPart = (seconds % 60).toString().padStart(2, "0");
  return `${minutesPart}:${secondsPart}`;
};

export const signedAngleDiff = (target: number, current: number) =>
  ((((target - current) % 360) + 540) % 360) - 180;

export const isOscillationPattern = (
  directions: TurnDirection[],
  yaws: number[],
  maxWindow: number,
  maxNetDeg: number
) => {
  if (directions.length < maxWindow || yaws.length < maxWindow) return false;
  for (let i = 1; i < directions.length; i += 1) {
    if (directions[i] === directions[i - 1]) return false;
  }

  const startYaw = yaws[0];
  const endYaw = yaws[yaws.length - 1];
  const netDisplacement = Math.abs(signedAngleDiff(endYaw, startYaw));
  return netDisplacement <= maxNetDeg;
};
