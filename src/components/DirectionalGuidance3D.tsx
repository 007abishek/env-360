import { useEffect, useMemo, useRef, useState } from "react";
import "../lib/aframe";
import { getDirectionalGuidance, normalizeYaw, shortestAngleDiff } from "../utils/directionalGuidance";

type DirectionalGuidance3DProps = {
  currentYaw: number;
  targetYaw: number;
  lockedDirection: -1 | 0 | 1;
  isDirectionWrong: boolean;
  invertHorizontal: boolean;
};

export const DirectionalGuidance3D = ({
  currentYaw,
  targetYaw,
  lockedDirection: _lockedDirection,
  isDirectionWrong,
  invertHorizontal,
}: DirectionalGuidance3DProps) => {
  const previousFilteredYawRef = useRef<number | null>(null);
  const [filteredYaw, setFilteredYaw] = useState(currentYaw);
  const [smoothedArrowX, setSmoothedArrowX] = useState(0);

  useEffect(() => {
    setFilteredYaw((previous) => {
      const delta = shortestAngleDiff(currentYaw, previous);
      return normalizeYaw(previous + delta * 0.28);
    });
  }, [currentYaw]);

  const guidance = useMemo(
    () =>
      getDirectionalGuidance({
        currentYaw: filteredYaw,
        targetYaw,
        previousYaw: previousFilteredYawRef.current,
        invertHorizontal,
      }),
    [filteredYaw, targetYaw, invertHorizontal]
  );

  useEffect(() => {
    previousFilteredYawRef.current = filteredYaw;
  }, [filteredYaw]);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      setSmoothedArrowX((previous) => {
        const next = previous + (guidance.arrowX - previous) * 0.2;
        if (Math.abs(next - guidance.arrowX) < 0.003) {
          return guidance.arrowX;
        }
        frame = requestAnimationFrame(animate);
        return next;
      });
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [guidance.arrowX]);

  const showArrow = !guidance.targetReached;
  const arrowDirection = guidance.turnHint === "right" ? 1 : -1;
  const arrowColor = isDirectionWrong ? "#ef4444" : guidance.arrowColor;
  const instruction = guidance.instruction;
  const headOffsets = [-0.14, -0.06, 0.02].map((offset) =>
    (smoothedArrowX + arrowDirection * offset).toFixed(3)
  );

  return (
    <a-scene
      embedded
      vr-mode-ui="enabled: false"
      xr-mode-ui="enabled: false"
      device-orientation-permission-ui="enabled: false"
      renderer="alpha: true"
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <a-entity camera look-controls-enabled="false" wasd-controls-enabled="false">
        <a-entity
          position="0 0.3 -1.1"
          text={`value: ${instruction}; align: center; color: ${arrowColor}; width: 2.8`}
        />

        {showArrow && (
          <>
            <a-entity
              position={`${smoothedArrowX.toFixed(3)} -0.01 -1.08`}
              geometry={`primitive: box; width: 0.11; height: 0.05; depth: 0.02`}
              material={`color: ${arrowColor}; opacity: 0.96`}
            />
            {headOffsets.map((headX, index) => (
              <a-entity
                key={headX}
                position={`${headX} -0.01 -1.08`}
                rotation={`0 0 ${arrowDirection > 0 ? -90 : 90}`}
                geometry="primitive: triangle; vertexA: 0 0.08 0; vertexB: -0.085 -0.055 0; vertexC: 0.085 -0.055 0"
                material={`color: ${arrowColor}; opacity: ${0.78 + index * 0.1}`}
              />
            ))}
          </>
        )}
      </a-entity>
    </a-scene>
  );
};
