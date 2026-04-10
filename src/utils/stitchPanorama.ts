import { normalizeYaw } from "./directionalGuidance";

export type StitchFrame = {
  src: string;
  yaw: number;
  capturedAt: number;
};

const DEFAULT_HORIZONTAL_FOV_DEG = 60;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load frame for panorama stitching."));
    image.src = src;
  });

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const stitchPanorama = async (frames: StitchFrame[]) => {
  if (frames.length === 0) {
    throw new Error("No frames available for stitching.");
  }

  const preparedFrames = [...frames]
    .map((frame, index) => ({
      ...frame,
      yaw: normalizeYaw(frame.yaw),
      capturedAt: Number.isFinite(frame.capturedAt) ? frame.capturedAt : index,
    }))
    .sort((a, b) => a.capturedAt - b.capturedAt);

  const images = await Promise.all(preparedFrames.map((frame) => loadImage(frame.src)));
  const sourceWidth = images[0].width;
  const sourceHeight = images[0].height;

  const panoHeight = sourceHeight;
  const panoWidth = Math.max(2048, Math.round((sourceWidth * 360) / DEFAULT_HORIZONTAL_FOV_DEG));
  const projectedWidth = Math.max(8, Math.round((panoWidth * DEFAULT_HORIZONTAL_FOV_DEG) / 360));
  const pixelCount = panoWidth * panoHeight;

  const outR = new Uint8ClampedArray(pixelCount);
  const outG = new Uint8ClampedArray(pixelCount);
  const outB = new Uint8ClampedArray(pixelCount);
  const bestWeight = new Float32Array(pixelCount);

  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = sourceWidth;
  sampleCanvas.height = sourceHeight;
  const sampleCtx = sampleCanvas.getContext("2d");
  if (!sampleCtx) {
    throw new Error("Unable to create canvas context for panorama stitching.");
  }

  for (let i = 0; i < images.length; i += 1) {
    sampleCtx.clearRect(0, 0, sourceWidth, sourceHeight);
    sampleCtx.drawImage(images[i], 0, 0, sourceWidth, sourceHeight);
    const frameData = sampleCtx.getImageData(0, 0, sourceWidth, sourceHeight).data;
    const centerX = ((i + 0.5) / preparedFrames.length) * panoWidth;

    for (let y = 0; y < panoHeight; y += 1) {
      for (let px = 0; px < projectedWidth; px += 1) {
        const u = (px + 0.5) / projectedWidth;
        const srcX = clamp(Math.floor(u * sourceWidth), 0, sourceWidth - 1);
        const srcIndex = (y * sourceWidth + srcX) * 4;

        const feather = 0.22 + 0.78 * Math.sin(Math.PI * u);
        const rawX = Math.round(centerX - projectedWidth / 2 + px);
        const wrappedX = ((rawX % panoWidth) + panoWidth) % panoWidth;
        const destIndex = y * panoWidth + wrappedX;

        if (feather > bestWeight[destIndex]) {
          bestWeight[destIndex] = feather;
          outR[destIndex] = frameData[srcIndex];
          outG[destIndex] = frameData[srcIndex + 1];
          outB[destIndex] = frameData[srcIndex + 2];
        }
      }
    }
  }

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = panoWidth;
  outputCanvas.height = panoHeight;
  const outputCtx = outputCanvas.getContext("2d");
  if (!outputCtx) {
    throw new Error("Unable to create output canvas for panorama stitching.");
  }

  const output = outputCtx.createImageData(panoWidth, panoHeight);
  const outputData = output.data;

  for (let i = 0; i < pixelCount; i += 1) {
    const di = i * 4;

    if (bestWeight[i] > 0) {
      outputData[di] = outR[i];
      outputData[di + 1] = outG[i];
      outputData[di + 2] = outB[i];
      outputData[di + 3] = 255;
    } else {
      outputData[di] = 10;
      outputData[di + 1] = 14;
      outputData[di + 2] = 24;
      outputData[di + 3] = 255;
    }
  }

  outputCtx.putImageData(output, 0, 0);
  return outputCanvas.toDataURL("image/jpeg", 0.98);
};
