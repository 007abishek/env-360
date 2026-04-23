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

export type PanoramaLevelState = {
  pitchDriftDeg: number;
  rollDriftDeg: number;
  combinedDriftDeg: number;
  verticalOffsetPx: number;
  isAligned: boolean;
  hint: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getPanoramaLevelState = (
  pitchValue: number,
  rollValue: number,
  targetPitchDeg: number,
  maxPitchDriftDeg: number,
  maxRollDriftDeg: number,
  maxCombinedDriftDeg: number
): PanoramaLevelState => {
  const pitchDrift = Math.abs(Math.abs(pitchValue) - targetPitchDeg);
  const rollDrift = Math.abs(rollValue);
  const combinedDrift = Math.hypot(pitchDrift, rollDrift * 0.8);

  const pitchSignedError = targetPitchDeg - Math.abs(pitchValue);
  const alignmentOffsetPx = clamp(pitchSignedError * 0.62 + rollValue * 0.5, -24, 24);
  const isAligned =
    pitchDrift <= maxPitchDriftDeg &&
    rollDrift <= maxRollDriftDeg &&
    combinedDrift <= maxCombinedDriftDeg;

  const hint =
    alignmentOffsetPx > 10
      ? "Lower phone slightly"
      : alignmentOffsetPx < -10
        ? "Raise phone slightly"
        : "Keep arrow on center line";

  return {
    pitchDriftDeg: pitchDrift,
    rollDriftDeg: rollDrift,
    combinedDriftDeg: combinedDrift,
    verticalOffsetPx: alignmentOffsetPx,
    isAligned,
    hint,
  };
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
