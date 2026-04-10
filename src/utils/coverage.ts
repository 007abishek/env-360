export const SEGMENT = 30;
export const covered = new Set<number>();
export const TOTAL_SEGMENTS = 360 / SEGMENT;

export const updateCoverage = (yaw: number) => {
  const normalized = ((yaw % 360) + 360) % 360;
  const seg = Math.floor(normalized / SEGMENT);
  covered.add(seg);
};

export const getCoverage = () => {
  return (covered.size / TOTAL_SEGMENTS) * 100;
};

export const resetCoverage = () => {
  covered.clear();
};
