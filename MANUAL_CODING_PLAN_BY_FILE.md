# Manual Coding Plan By File (Line-by-Line Order)

Use this as an exact implementation order per file.

## 1. `src/lib/aframe.ts`
1. Add one line:
```ts
import "aframe";
```

## 2. `src/types/aframe.d.ts`
1. Import React HTML/CSS prop types.
2. Create `AFrameElementProps`.
3. Extend JSX intrinsic elements in:
   - `react`
   - `react/jsx-runtime`
4. Add tags:
   - `a-scene`
   - `a-sky`
   - `a-entity`
   - `a-camera`
   - `a-cone`
5. Export empty object at end.

## 3. `src/types/scan.ts`
1. Add `TurnDirection = -1 | 0 | 1`.
2. Add `CapturePreview` type:
   - `id`
   - `src`
   - `timestampSec`
   - `direction`
   - `yaw`

## 4. `src/constants/scanConfig.ts`
Add constants in this order:
1. `DUPLICATE_THRESHOLD`
2. `REQUIRED_COVERAGE`
3. `CAPTURE_INTERVAL_MS`
4. `MIN_SCAN_DURATION_SECONDS`
5. `MAX_SCAN_DURATION_SECONDS`
6. `MAX_ANGULAR_JUMP_DEG`
7. `MIN_DIRECTIONAL_DELTA_DEG`
8. `MAX_DIRECTION_FLIP_STREAK`
9. `OSCILLATION_WINDOW`
10. `MAX_OSCILLATION_NET_DEG`
11. `MIN_UPRIGHT_PITCH_DEG`
12. `MAX_UPRIGHT_PITCH_DEG`
13. `MAX_ALLOWED_ROLL_DEG`
14. `DEFAULT_START_DIRECTION` (typed as `TurnDirection`)

## 5. `src/utils/coverage.ts`
1. `SEGMENT = 30`
2. `covered = new Set<number>()`
3. `TOTAL_SEGMENTS = 360 / SEGMENT`
4. `updateCoverage(yaw)`
5. `getCoverage()`
6. `resetCoverage()`

## 6. `src/utils/directionalGuidance.ts`
Write in this order:
1. `TurnHint` type
2. `GuidanceStatus` type
3. `clamp`
4. `normalizeYaw`
5. `shortestAngleDiff`
6. `segmentToYaw`
7. `DirectionalGuidanceInput` type
8. `DirectionalGuidanceState` type
9. `getDirectionalGuidance(...)`
   - normalize yaw/target
   - compute shortest delta
   - hold-steady condition
   - turn hint
   - arrow position
   - movement direction inference
   - status + color
   - return object

## 7. `src/utils/scanHelpers.ts`
Add helpers in this order:
1. `getSegmentFromYaw(value, segmentSize)`
2. `isPerpendicularPortrait(pitch, roll, minPitch, maxPitch, maxRoll)`
3. `getNextTargetSegment(yaw, segmentSize, totalSegments, coveredSet, lockedDirection, defaultDirection)`
4. `getDirectionFromYaw(value)`
5. `getMissingSegments(totalSegments, coveredSet)`
6. `formatTimestamp(totalSeconds)`
7. `signedAngleDiff(target, current)`
8. `isOscillationPattern(directions, yaws, maxWindow, maxNetDeg)`

## 8. `src/utils/stitchPanorama.ts`
Write in this order:
1. Import `normalizeYaw`
2. `StitchFrame` type:
   - `src`
   - `yaw`
   - `capturedAt`
3. constants (`DEFAULT_HORIZONTAL_FOV_DEG`)
4. `loadImage(src)`
5. `clamp`
6. `stitchPanorama(frames)`:
   - guard empty frames
   - normalize + sort by `capturedAt`
   - load images
   - derive pano dimensions
   - allocate output buffers
   - render each frame into sample canvas
   - project each frame slice into pano x-space
   - compose pixels (winner/weight logic)
   - write final `ImageData`
   - return JPEG data URL

## 9. `src/hooks/useOrientation.ts`
1. orientation state: `{ yaw, pitch, roll }`
2. `deviceorientation` event listener
3. update state from:
   - `alpha -> yaw`
   - `beta -> pitch`
   - `gamma -> roll`
4. cleanup listener
5. return orientation object

## 10. `src/hooks/useCamera.ts`
Write in this order:
1. `videoRef`, `streamRef`
2. states: `cameraError`, `isBackCamera`
3. `attachStreamToVideo()`
4. `stopCamera()`
5. `startCamera()`
   - secure-context checks
   - `getUserMedia` fallback chain
   - detect `facingMode`
   - set `isBackCamera`
   - attach stream
6. `useEffect` cleanup with `stopCamera`
7. return:
   - refs/states
   - control functions

## 11. `src/hooks/useFrameCapture.ts`
Write in this order:
1. `DEFAULT_HASH_SIZE`
2. internal `getFrameCanvas(source, options)`
3. `useFrameCapture()`
4. `computeFrameHash(video, hashSize?)`
5. `hammingDistance(a, b)`
6. `captureFrame(video, { maxWidth, quality })`
7. return all 3 functions

## 12. `src/components/AFrameInstructions.tsx`
1. import `../lib/aframe`
2. render `a-scene` in embedded mode
3. add instruction text entities
4. add `a-sky`
5. add static `a-camera`

## 13. `src/components/DirectionalGuidance3D.tsx`
Write in this order:
1. imports (`aframe`, guidance helpers, React hooks)
2. props type:
   - `currentYaw`
   - `targetYaw`
   - `lockedDirection`
   - `isDirectionWrong`
   - `invertHorizontal`
3. filtered yaw state/refs
4. `guidance` memo from `getDirectionalGuidance`
5. smoothing effects:
   - yaw filter
   - previous yaw ref
   - arrow X interpolation
6. derive render values:
   - `showArrow`
   - `arrowDirection`
   - `arrowColor`
   - instruction text
7. render:
   - `a-scene`
   - text entity
   - triple-chevron arrow entities

## 14. `src/components/ScanScreen.tsx`
Write in this order:
1. props type
2. calculate `targetYaw` from segment
3. render `<video>`
4. posture warning overlay card (conditional)
5. overlay container with `DirectionalGuidance3D`
6. top guidance header strip
7. helper footer text
8. coverage label and subtitle

## 15. `src/components/CoverageDirectionMap.tsx`
1. props type
2. local `toDirection(angle)` helper
3. compute `totalSegments`, `coveredSet`
4. render grid over all segments
5. show:
   - direction label
   - angle range
   - covered/pending status

## 16. `src/components/CapturedImagesGrid.tsx`
1. props type (`captures`)
2. early return if empty
3. heading
4. card grid
5. each card:
   - image
   - index badge
   - timestamp + direction text

## 17. `src/components/PanoramaViewer.tsx`
1. props type (`image`)
2. render container card
3. render final stitched `<img>`
4. render note text

## 18. `src/App.tsx` (Main Orchestration)
Implement in this order:
1. imports
2. refs for live scan state:
   - yaw/pitch/roll refs
   - motion refs
   - timing/hash refs
3. hook calls:
   - `useCamera`
   - `useFrameCapture`
   - `useOrientation`
4. React state:
   - captured frames
   - coverage
   - panorama
   - start status
   - scan hints
   - captured previews
   - direction lock state
5. derived values:
   - `totalSegments`
   - helpers for duration/window
6. `startCamera()`:
   - request motion permission (iOS)
   - reset scan state
   - call `startCameraStream()`
7. capture interval effect:
   - validate camera readiness
   - posture check (pitch/roll)
   - motion checks (jump/flip/oscillation)
   - direction lock/reversal logic
   - hash + duplicate filtering
   - capture frame + add yaw/timestamp
   - update coverage and preview list
8. sync orientation refs effect
9. attach stream effect after start
10. `generate()`:
   - require frames
   - require full segment coverage
   - require valid time window
   - stitch + save panorama
11. `downloadPanorama()`
12. render UI in this order:
   - title + instructions
   - start section
   - scan section (`ScanScreen`, yaw/hint/map/button/stats)
   - captured images grid
   - panorama view + download button + pass/fail

## 19. `src/main.tsx`
1. import `index.css`
2. mount `<App />` in `<StrictMode>`

---

## Final Manual QA Order
1. Camera starts on mobile back camera.
2. Yaw changes live.
3. Wrong posture blocks coverage.
4. Direction lock + red reversal works.
5. Arrow direction and color behavior both correct.
6. Coverage reaches full 360.
7. Panorama generates and auto-downloads.
8. `npm run build` passes.
