const DEFAULT_HASH_SIZE = 8;

const getFrameCanvas = (
  source: HTMLVideoElement,
  options?: { maxWidth?: number; quality?: number }
) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const sourceWidth = source.videoWidth || 1280;
  const sourceHeight = source.videoHeight || 720;
  const maxWidth = options?.maxWidth ?? 1280;
  const scale = sourceWidth > maxWidth ? maxWidth / sourceWidth : 1;

  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.round(sourceHeight * scale);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
};

export const useFrameCapture = () => {
  const computeFrameHash = (source: HTMLVideoElement, hashSize = DEFAULT_HASH_SIZE) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = hashSize;
    canvas.height = hashSize;
    ctx.drawImage(source, 0, 0, hashSize, hashSize);

    const { data } = ctx.getImageData(0, 0, hashSize, hashSize);
    const grayscale: number[] = [];

    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      grayscale.push(gray);
    }

    const avg = grayscale.reduce((sum, value) => sum + value, 0) / grayscale.length;
    return grayscale.map((value) => (value >= avg ? "1" : "0")).join("");
  };

  const hammingDistance = (a: string, b: string) => {
    if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) diff += 1;
    }
    return diff;
  };

  const captureFrame = (
    source: HTMLVideoElement,
    options?: { maxWidth?: number; quality?: number }
  ) => {
    const frameCanvas = getFrameCanvas(source, options);
    if (!frameCanvas) return null;
    const quality = options?.quality ?? 0.98;
    return frameCanvas.canvas.toDataURL("image/jpeg", quality);
  };

  return {
    captureFrame,
    computeFrameHash,
    hammingDistance,
  };
};
