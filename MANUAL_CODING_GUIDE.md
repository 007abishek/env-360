# Manual Coding Guide: 360 Environment Scan (React + TypeScript + A-Frame)

This guide helps you build the same project manually from scratch in a clean, maintainable way.

## 1. Project Setup

1. Create app:
```bash
npm create vite@latest env-scan -- --template react-ts
cd env-scan
npm install
```

2. Install A-Frame:
```bash
npm install aframe
```

3. Run:
```bash
npm run dev
```

## 2. Folder Structure

Use this structure:

```text
src/
  components/
    AFrameInstructions.tsx
    CoverageDirectionMap.tsx
    DirectionalGuidance3D.tsx
    PanoramaViewer.tsx
    ScanScreen.tsx
    CapturedImagesGrid.tsx
  hooks/
    useCamera.ts
    useFrameCapture.ts
    useOrientation.ts
  utils/
    coverage.ts
    directionalGuidance.ts
    scanHelpers.ts
    stitchPanorama.ts
  constants/
    scanConfig.ts
  types/
    aframe.d.ts
    scan.ts
  lib/
    aframe.ts
  App.tsx
  main.tsx
  index.css
```

## 3. Core Features To Implement

## 3.1 Orientation (Yaw/Pitch/Roll)
- In `useOrientation.ts`, listen to `deviceorientation`.
- Return:
  - `yaw` (`alpha`) for 360 direction
  - `pitch` (`beta`) for posture validation
  - `roll` (`gamma`) for posture validation

## 3.2 Camera Hook
- In `useCamera.ts`:
  - Try back camera first (`facingMode: environment`)
  - Fallback to generic camera
  - Attach stream to `video`
  - Detect back/front camera from track settings
  - Cleanup tracks on unmount

## 3.3 Frame Capture Hook
- In `useFrameCapture.ts`:
  - `captureFrame(video, { maxWidth, quality })`
  - `computeFrameHash(video)` for duplicate filtering
  - `hammingDistance(a, b)`

## 3.4 Coverage Logic
- In `coverage.ts`:
  - Segment size = `30` deg
  - Track covered segments in a `Set`
  - `updateCoverage(yaw)`, `getCoverage()`, `resetCoverage()`

## 3.5 Scan Rules (Important)
- Only count coverage when posture is valid:
  - perpendicular portrait constraints (pitch/roll thresholds)
- Lock scan direction on first valid turn:
  - continue same direction = valid
  - reverse before 360 complete = error/red
- Reject noisy motion:
  - large yaw jump
  - frequent flips
  - oscillation pattern

## 3.6 Arrow Guidance (A-Frame)
- `DirectionalGuidance3D.tsx`:
  - embedded `<a-scene>`
  - arrow + instruction text in front of camera
  - green when direction is correct
  - red when reversed before full 360
  - back-camera horizontal inversion support

## 3.7 Stitching
- In `stitchPanorama.ts`:
  - Accept frames with metadata:
    - `src`
    - `yaw`
    - `capturedAt`
  - Load all images
  - Sort by capture time for sequence stitching
  - Project onto panorama canvas and compose
  - Export high-quality JPEG (`0.98`)

## 3.8 Full 360 Validation
- Require all yaw segments covered before final stitch:
  - if missing, show missing angle ranges
- Only then allow panorama generation and download

## 4. App Composition

In `App.tsx`, keep it orchestration-only:
- Use hooks:
  - `useOrientation`
  - `useCamera`
  - `useFrameCapture`
- Use helper modules:
  - `scanHelpers`
  - `scanConfig`
  - `coverage`
- Render:
  - `AFrameInstructions`
  - `ScanScreen`
  - `CoverageDirectionMap`
  - `CapturedImagesGrid`
  - `PanoramaViewer`

## 5. A-Frame TypeScript Support

In `types/aframe.d.ts`, declare intrinsic JSX elements:
- `a-scene`
- `a-sky`
- `a-entity`
- `a-camera`
- `a-cone` (if needed)

And import A-Frame side effects from `lib/aframe.ts`:
```ts
import "aframe";
```

## 6. Manual Build Checklist

- Camera starts and preview shows
- Yaw updates live
- Wrong phone angle shows warning and blocks coverage
- Direction lock works
- Arrow turns red on reversal before full 360
- Coverage reaches 100% only after full scan
- Stitch works and output downloads
- Build passes:
```bash
npm run build
```

## 7. Suggested Commit Order (Manual)

1. Base app + camera + orientation
2. Coverage + scan helpers/config
3. A-Frame guidance UI
4. Direction lock + error logic
5. Stitching + download
6. Cleanup + refactor into hooks/components

---

If you want, I can also generate a second markdown file with a **line-by-line coding plan per file** (exact order of functions and props to write).
