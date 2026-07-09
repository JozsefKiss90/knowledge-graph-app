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

    // The insets keep the card clear of the top/left chrome on desktop, but on
    // small screens they exceed the available space and would push the card
    // off-screen (the clamp bounds invert). Drop them below the md breakpoint.
    const compact = viewportW < 900;
    const topInset = compact ? 0 : EXTRA_TOP_INSET;
    const leftInset = compact ? 0 : EXTRA_LEFT_INSET;

    // Never let the card footprint exceed the viewport (mirrors the CSS
    // max-width / max-height caps) so the clamp bounds stay valid.
    const effW = Math.min(w, viewportW - 2 * PADDING);
    const effH = Math.min(h, viewportH - 2 * PADDING);

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const placements = [
      { name: "right", x: anchorX + 18, y: anchorY - 8 },
      { name: "left", x: anchorX - effW - 18, y: anchorY - 8 },
      { name: "below", x: anchorX - effW / 2, y: anchorY + 18 },
      { name: "above", x: anchorX - effW / 2, y: anchorY - effH - 18 },
    ];

    const scored = placements.map((p) => {
      // Upper bounds first, then keep the lower bound at or below them so the
      // clamp can never invert on a small viewport.
      const maxX = Math.max(PADDING, viewportW - effW - PADDING);
      const maxY = Math.max(PADDING, viewportH - effH - PADDING);
      const minX = Math.min(PADDING + leftInset, maxX);
      const minY = Math.min(PADDING + topInset, maxY);

      const x = clamp(p.x, minX, maxX);
      const y = clamp(p.y, minY, maxY);

      const dx = Math.abs(x - p.x);
      const dy = Math.abs(y - p.y);

      // Penalise being forced into the reserved inset zones (desktop only —
      // the insets are 0 on small screens).
      const insetPenalty =
        (leftInset > 0 && x <= PADDING + leftInset ? 1000 : 0) +
        (topInset > 0 && y <= PADDING + topInset ? 1000 : 0);

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
