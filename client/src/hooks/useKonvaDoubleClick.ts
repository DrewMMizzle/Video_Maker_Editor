import { useRef, useCallback } from "react";
import type Konva from "konva";

type Options = {
  timeoutMs?: number;      // max gap between clicks/taps
  moveTol?: number;        // max cursor movement between clicks/taps
  onDouble?: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onSingle?: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void; // optional
};

export function useKonvaDoubleClick({
  timeoutMs = 300,
  moveTol = 6,
  onDouble,
  onSingle,
}: Options) {
  const lastTimeRef = useRef(0);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTargetIdRef = useRef<string | null>(null);
  const singleTimerRef = useRef<number | null>(null);

  const clearSingleTimer = () => {
    if (singleTimerRef.current != null) {
      window.clearTimeout(singleTimerRef.current);
      singleTimerRef.current = null;
    }
  };

  const handler = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const now = performance.now();
      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition() || { x: 0, y: 0 };
      const id = e.target.id();

      const dt = now - lastTimeRef.current;
      const prev = lastPosRef.current;

      const moved =
        prev ? Math.hypot(pos.x - prev.x, pos.y - prev.y) > moveTol : false;
      const sameTarget = id && lastTargetIdRef.current === id;

      if (dt < timeoutMs && !moved && sameTarget) {
        // DOUBLE
        clearSingleTimer();
        lastTimeRef.current = 0;
        lastPosRef.current = null;
        lastTargetIdRef.current = null;
        onDouble?.(e);
      } else {
        // candidate for SINGLE
        clearSingleTimer();
        singleTimerRef.current = window.setTimeout(() => {
          onSingle?.(e);
        }, timeoutMs) as unknown as number;

        lastTimeRef.current = now;
        lastPosRef.current = pos;
        lastTargetIdRef.current = id;
      }
    },
    [moveTol, onDouble, onSingle, timeoutMs]
  );

  return handler;
}