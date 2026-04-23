export type TurnDirection = -1 | 0 | 1;

export type CapturePreview = {
  id: number;
  src: string;
  timestampSec: number;
  direction: string;
  yaw: number;
};
