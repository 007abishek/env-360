# Segment Target Yaw and Selection Scenarios

This file explains how the scan app chooses `targetYaw` for the 360-degree guide.

## Core Rule

- Segment size is `30°`.
- Total segments are `12`.
- `targetYaw` is the center of the target segment.
- Formula from [directionalGuidance.ts](/d:/env-scan/src/utils/directionalGuidance.ts#L11):

```ts
targetYaw = segment * segmentSize + segmentSize / 2
```

With `segmentSize = 30`, each target yaw is the midpoint of a 30-degree segment.

## All Segments and Target Yaw

| Segment | Angle Range | Target Yaw |
| --- | --- | --- |
| 0 | `0°-29.999°` | `15°` |
| 1 | `30°-59.999°` | `45°` |
| 2 | `60°-89.999°` | `75°` |
| 3 | `90°-119.999°` | `105°` |
| 4 | `120°-149.999°` | `135°` |
| 5 | `150°-179.999°` | `165°` |
| 6 | `180°-209.999°` | `195°` |
| 7 | `210°-239.999°` | `225°` |
| 8 | `240°-269.999°` | `255°` |
| 9 | `270°-299.999°` | `285°` |
| 10 | `300°-329.999°` | `315°` |
| 11 | `330°-359.999°` | `345°` |

## How the App Chooses the Target Segment

The target segment is selected in [scanHelpers.ts](/d:/env-scan/src/utils/scanHelpers.ts#L22) by `getNextTargetSegment(...)`.

The app:

- Finds the current segment from the current yaw.
- Chooses a direction.
- Searches forward in that direction for the next uncovered segment.
- Converts that segment to `targetYaw`.

The selected target segment is passed from [App.tsx](/d:/env-scan/src/App.tsx#L359) into [ScanScreen.tsx](/d:/env-scan/src/components/ScanScreen.tsx#L29), where it becomes `targetYaw`.

## Direction Scenarios

### 1. Before direction is locked

- `lockedDirection = 0`
- The app uses `DEFAULT_START_DIRECTION = -1`
- That means it initially looks for the next uncovered segment by moving left/counterclockwise through segments

Example:

- Current yaw is `100°`
- Current segment is `3`
- If direction is not locked yet, the search order is `3, 2, 1, 0, 11, 10...`
- The first uncovered segment in that order becomes the target

### 2. Direction locked to left

- `lockedDirection = -1`
- The app keeps choosing targets in the left/counterclockwise direction

Example:

- Current segment is `6`
- If segments `6` and `5` are already covered, the next target may be segment `4`
- Segment `4` maps to target yaw `135°`

### 3. Direction locked to right

- `lockedDirection = 1`
- The app keeps choosing targets in the right/clockwise direction

Example:

- Current segment is `6`
- If segments `6` and `7` are already covered, the next target may be segment `8`
- Segment `8` maps to target yaw `255°`

### 4. Current segment is still uncovered

- The search starts from the current segment itself
- If the current segment is uncovered, it becomes the target immediately

Example:

- Current yaw is `212°`
- Current segment is `7`
- If segment `7` is not yet covered, target yaw is `225°`

### 5. Current segment already covered

- The app skips that segment
- It keeps moving in the chosen direction until it finds the first uncovered segment

Example:

- Current yaw is in segment `7`
- Segment `7` is already covered
- With rightward scan, the app checks `8`, then `9`, then `10`...

## Guidance Scenarios

Once `targetYaw` is chosen, `getDirectionalGuidance(...)` in [directionalGuidance.ts](/d:/env-scan/src/utils/directionalGuidance.ts#L36) compares:

- `currentYaw`
- `targetYaw`

It computes `targetDelta`, which is the shortest angular difference to the target.

### 6. Within tolerance

- Default `toleranceDeg` is `10`
- If the phone is within `10°` of `targetYaw`, the guide says `Hold steady`

Example:

- `targetYaw = 225°`
- Any current yaw roughly from `215°` to `235°` is accepted as reached

### 7. Target is to the right

- If `targetDelta > 0`, the guide shows `Turn Right`

Example:

- Current yaw `180°`
- Target yaw `225°`
- User still needs to rotate right

### 8. Target is to the left

- If `targetDelta < 0`, the guide shows `Turn Left`

Example:

- Current yaw `250°`
- Target yaw `225°`
- User needs to rotate left

### 9. Moving too fast

- If yaw change between samples is above `maxMovementDeg` in the guide logic, the status becomes `too_fast`
- Instruction becomes `Move slowly`

This is separate from scan validation in [App.tsx](/d:/env-scan/src/App.tsx), which also checks overall rotation speed and jump size.

### 10. Moving in the wrong direction

- If the user is moving opposite to the target hint, the guidance status becomes `wrong`
- The arrow color becomes red

This is guide-level feedback. The scan logic in [App.tsx](/d:/env-scan/src/App.tsx) also detects real direction reversal before full coverage.

## Full Coverage Scenario

If all segments are covered:

- `getNextTargetSegment(...)` returns `-1`
- In [ScanScreen.tsx](/d:/env-scan/src/components/ScanScreen.tsx#L29), the fallback is:

```ts
const targetYaw = targetSegment >= 0 ? segmentToYaw(targetSegment, segmentSize) : yaw;
```

That means:

- no new segment is targeted
- `targetYaw` falls back to the current yaw
- the guide effectively has no new rotation target

## Quick Reference

- Segment width: `30°`
- Segment centers: `15°, 45°, 75°, 105°, 135°, 165°, 195°, 225°, 255°, 285°, 315°, 345°`
- Default unlocked scan direction: left/counterclockwise (`-1`)
- Tolerance to count target as reached: `10°`
- Target selection rule: first uncovered segment in the active scan direction
