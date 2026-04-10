# How This System Rendering Works

This file explains how the UI and guidance system are rendered in this 360 scan app.

## High-Level Render Flow

The render flow starts in [App.tsx](/d:/env-scan/src/App.tsx).

`App` is the root React component. It decides what the user sees based on state such as:

- `isStarted`
- `coverage`
- `scanHint`
- `capturedPreviews`
- `panorama`
- `lockedDirection`
- `isDirectionReversalError`

At a high level:

1. `App` renders the page shell and title.
2. It always renders the A-Frame instruction banner.
3. If scanning has not started, it renders the start button.
4. If scanning has started, it renders the live scan UI.
5. If panorama generation finishes, it renders the panorama viewer and download button.

## Initial Screen Rendering

Before scanning starts:

- [App.tsx](/d:/env-scan/src/App.tsx) renders:
  - heading
  - [`AFrameInstructions`](/d:/env-scan/src/components/AFrameInstructions.tsx)
  - start button
  - camera error text if any

At this point:

- camera video is not shown yet
- scan overlay is not shown yet
- coverage map is not shown yet
- panorama viewer is not shown yet

## What Happens When Scan Starts

When the user clicks `Start Environment Scan`:

- `startCamera()` runs in [App.tsx](/d:/env-scan/src/App.tsx)
- scan state is reset
- coverage state is reset
- captured frames are cleared
- panorama is cleared
- `isStarted` becomes `true`
- camera startup begins through `useCamera()`

That state change causes React to re-render `App`.

Now the UI switches from the start screen to the active scan screen.

## Active Scan Rendering

When `isStarted` is `true`, `App` renders:

- [`ScanScreen`](/d:/env-scan/src/components/ScanScreen.tsx)
- current yaw text
- scan hint text
- [`CoverageDirectionMap`](/d:/env-scan/src/components/CoverageDirectionMap.tsx)
- generate panorama button
- scan time and coverage stats
- captured image grid when enough coverage is reached
- panorama viewer after stitching is complete

This means the visible scan experience is composed from multiple render layers, not one single canvas.

## ScanScreen Rendering Structure

[`ScanScreen`](/d:/env-scan/src/components/ScanScreen.tsx) is the main live camera UI.

It renders these layers:

1. Base layer:
   - an HTML `<video>` element showing the live camera feed

2. Posture warning layer:
   - a centered overlay shown only when posture is invalid
   - this blocks the visual area with a warning card

3. 3D guidance layer:
   - a positioned container on top of the video
   - inside it, [`DirectionalGuidance3D`](/d:/env-scan/src/components/DirectionalGuidance3D.tsx) renders an embedded A-Frame scene

4. Header overlay:
   - top label saying `360 degree view guidance`

5. Bottom helper overlay:
   - label saying `Follow the 3D arrow guide`

6. Text below video:
   - coverage percentage
   - simple instruction text

So the main rendered view is:

- real camera video in HTML
- guidance graphics layered above it
- text overlays and warnings positioned with CSS

## How the 3D Guidance Is Rendered

[`DirectionalGuidance3D`](/d:/env-scan/src/components/DirectionalGuidance3D.tsx) does not render traditional DOM arrows.
It renders an embedded A-Frame scene.

Inside that component:

- `<a-scene>` creates the A-Frame scene
- `<a-entity camera>` creates a fixed camera inside the scene
- text is rendered using A-Frame `text`
- the arrow body is a box geometry
- the arrow head is made from multiple triangle geometries

This gives a lightweight pseudo-3D overlay.

## How the Arrow Position Is Calculated

The guidance overlay is driven by:

- `currentYaw`
- `targetYaw`
- `previousYaw`
- `invertHorizontal`

These values are passed into `getDirectionalGuidance(...)` in [directionalGuidance.ts](/d:/env-scan/src/utils/directionalGuidance.ts).

That function computes:

- `targetDelta`
- whether the target has been reached
- whether the user should turn left or right
- whether motion is too fast
- arrow color
- arrow horizontal offset as `arrowX`

Then `DirectionalGuidance3D` renders the arrow using that computed state.

## Why the Arrow Looks Smooth

The component smooths the rendering in two stages:

1. Yaw smoothing
   - `filteredYaw` is updated from `currentYaw`
   - it applies only part of the delta on each change

2. Arrow animation smoothing
   - `smoothedArrowX` moves gradually toward `guidance.arrowX`
   - this uses `requestAnimationFrame`

Because of that:

- the arrow does not jump harshly with noisy sensor values
- direction changes feel more stable
- the UI looks more continuous

## How React Re-renders During Scanning

React re-renders the UI when state changes in `App`.

Important re-render triggers include:

- `setCoverage(...)`
- `setScanHint(...)`
- `setCapturedFrames(...)`
- `setCapturedPreviews(...)`
- `setLockedDirection(...)`
- `setIsDirectionReversalError(...)`
- `setPanorama(...)`
- `setIsStarted(...)`

Orientation values from `useOrientation()` also update over time:

- `yaw`
- `pitch`
- `roll`

Those values flow into the rendered tree and update:

- posture warning visibility
- current yaw text
- target segment calculation
- A-Frame guidance overlay

## How the Scan Loop Affects Rendering

The scanning logic runs inside a `setInterval(...)` in [App.tsx](/d:/env-scan/src/App.tsx).

Every capture interval:

1. current orientation refs are read
2. posture is validated
3. motion quality is validated
4. a frame hash is computed
5. a frame is captured from the video
6. coverage may be updated
7. previews may be added
8. hint text may be updated
9. coverage state is pushed into React

That loop does not draw directly to the screen.
Instead, it updates React state, and React re-renders the necessary components.

## How the Target Segment Affects Rendering

In [App.tsx](/d:/env-scan/src/App.tsx), `nextTargetSegment` is computed from:

- current yaw
- segment size
- covered segments
- locked direction
- default direction

That segment is passed into [`ScanScreen`](/d:/env-scan/src/components/ScanScreen.tsx).

Then `ScanScreen` converts it to `targetYaw`.

Then `DirectionalGuidance3D` renders the arrow toward that `targetYaw`.

So the chain is:

`scan state -> nextTargetSegment -> targetYaw -> guidance state -> rendered arrow`

## How the Coverage Map Is Rendered

[`CoverageDirectionMap`](/d:/env-scan/src/components/CoverageDirectionMap.tsx) renders a grid of all segments.

For each segment it renders:

- direction label
- angle range
- status text
- covered or pending styling

It is a plain React DOM grid, not A-Frame.

Covered segments get:

- green border
- green-tinted background
- `Covered` label

Pending segments get:

- darker border
- dark background
- `Pending` label

## How Captured Preview Rendering Works

When enough coverage is reached, `App` renders [`CapturedImagesGrid`](/d:/env-scan/src/components/CapturedImagesGrid.tsx).

That component receives `capturedPreviews` from React state and displays accepted capture thumbnails.

Only accepted captures appear there, not every raw frame.

## How Panorama Rendering Works

When the user clicks `Generate Stitched Panorama`:

- `generate()` runs in [App.tsx](/d:/env-scan/src/App.tsx)
- it first validates:
  - full segment coverage
  - minimum time
  - maximum time
- then it calls `stitchPanorama(...)`

When stitching finishes:

- `setPanorama(pano)` updates React state
- `App` re-renders
- [`PanoramaViewer`](/d:/env-scan/src/components/PanoramaViewer.tsx) appears
- the download button appears
- pass or fail text appears

So the final panoramic result is rendered only after the stitched image data URL is available.

## Rendering Technologies Used

This system uses a mixed rendering approach:

- React for state-driven UI composition
- standard HTML for video and buttons
- CSS positioning for overlays
- A-Frame for 3D guidance graphics
- image data URLs for captured frames and panorama output

It is not a single WebGL app and not a single canvas renderer.
It is a layered UI where DOM, media elements, and A-Frame are composed together.

## Practical Summary

The rendering model works like this:

1. React decides which UI blocks should exist.
2. The camera feed is rendered in a normal video element.
3. A-Frame renders the animated guidance overlay on top of the video.
4. Scan logic updates state at intervals.
5. State changes trigger React re-renders.
6. Coverage cards, preview images, and panorama output appear as state becomes available.
