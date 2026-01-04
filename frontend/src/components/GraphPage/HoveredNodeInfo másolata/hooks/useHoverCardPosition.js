import { useMemo } from "react";
import { EXTRA_LEFT_INSET, EXTRA_TOP_INSET, PADDING } from "../utils/constants";

/**
 * Auto-positioning hook:
 * - If dragPos exists => fixed position at dragPos
 * - Else choose best of right/left/below/above with clamps and inset avoidance
 */
export function useHoverCardPosition({ hoverPosition, dragPos, cardSize }) {
  const { w = 360, h = 260 } = cardSize || {};

  const { positionStyle, baseLeft, baseTop } = useMemo(() => {
    const viewportW = typeof window !== "undefined" ? window.innerWidth : 1280;
    const viewportH = typeof window !== "undefined" ? window.innerHeight : 720;

    // Drag override
    if (dragPos) {
      return {
        positionStyle: {
          position: "fixed",
          left: dragPos.x,
          top: dragPos.y,
          zIndex: 9999,
        },
        baseLeft: dragPos.x,
        baseTop: dragPos.y,
      };
    }

    const anchorX = hoverPosition?.x ?? viewportW / 2;
    const anchorY = hoverPosition?.y ?? viewportH / 2;

    const topInset = EXTRA_TOP_INSET;
    const leftInset = EXTRA_LEFT_INSET;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const placements = [
      { name: "right", x: anchorX + 18, y: anchorY - 8 },
      { name: "left", x: anchorX - w - 18, y: anchorY - 8 },
      { name: "below", x: anchorX - w / 2, y: anchorY + 18 },
      { name: "above", x: anchorX - w / 2, y: anchorY - h - 18 },
    ];

    const scored = placements.map((p) => {
      const x = clamp(p.x, PADDING + leftInset, viewportW - w - PADDING);
      const y = clamp(p.y, PADDING + topInset, viewportH - h - PADDING);

      const dx = Math.abs(x - p.x);
      const dy = Math.abs(y - p.y);

      // Strong penalty if forced into the inset "UI occupied" zones
      const insetPenalty =
        (x <= PADDING + leftInset ? 1000 : 0) + (y <= PADDING + topInset ? 1000 : 0);

      return { ...p, x, y, score: dx + dy + insetPenalty };
    });

    scored.sort((a, b) => a.score - b.score);
    const best = scored[0];

    return {
      positionStyle: {
        position: "fixed",
        left: best.x,
        top: best.y,
        zIndex: 9999,
      },
      baseLeft: best.x,
      baseTop: best.y,
    };
  }, [dragPos, hoverPosition?.x, hoverPosition?.y, w, h]);

  return { positionStyle, baseLeft, baseTop };
}
