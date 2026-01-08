import { useCallback, useRef, useState } from "react";

export function useGlowOverlay({ cyRef, wrapperRef }) {
  const [glowCircles, setGlowCircles] = useState([]);

  const rafGlowRef = useRef(0);
  const lastGlowKeyRef = useRef("");

  const resetGlow = useCallback(() => {
    setGlowCircles([]);
    lastGlowKeyRef.current = "";
  }, []);

  const scheduleGlowUpdate = useCallback(() => {
    if (rafGlowRef.current) return;

    rafGlowRef.current = window.requestAnimationFrame(() => {
      rafGlowRef.current = 0;

      const cy = cyRef.current;
      const wrap = wrapperRef.current;
      if (!cy || !wrap) return;

      const zoom = cy.zoom();
      const nodeCount = cy.nodes().length;

      const LARGE_GRAPH = 220;
      const ZOOM_LOW = 0.45;

      const nodesToGlow =
        nodeCount > LARGE_GRAPH || zoom < ZOOM_LOW
          ? cy.nodes(
              ".as-root, .as-cluster-root, .as-destination-root, .is-hovered, .highlighted, :selected"
            )
          : cy.nodes(":visible");

      const MAX_GLOWS = nodeCount > LARGE_GRAPH ? 140 : 260;

      const wrapRect = wrap.getBoundingClientRect();
      const w = wrapRect.width;
      const h = wrapRect.height;

      const pickColor = (n) => {
        if (n.hasClass("as-root")) return n.data("themeRootColor") || n.data("themeColor");
        if (n.hasClass("as-cluster-root"))
          return n.data("themeClusterRootColor") || n.data("themeColor");
        if (n.hasClass("as-destination-root"))
          return n.data("themeDestinationRootColor") || n.data("themeColor");
        return n.data("themeColor");
      };

      const onScreen = (x, y, r) => x + r >= 0 && y + r >= 0 && x - r <= w && y - r <= h;

      const circles = [];
      const arr = nodesToGlow.toArray();

      for (let i = 0; i < arr.length && circles.length < MAX_GLOWS; i++) {
        const n = arr[i];
        if (!n || n.removed() || !n.visible()) continue;

        const p = n.renderedPosition();
        const rw = n.renderedWidth();
        const rh = n.renderedHeight();
        const r = Math.max(rw, rh) * 0.42 + 4;

        const x = p.x;
        const y = p.y;

        if (!onScreen(x, y, r)) continue;

        const color = pickColor(n) || "rgba(91,124,255,0.9)";
        const strong =
          n.hasClass("as-root") ||
          n.hasClass("as-cluster-root") ||
          n.hasClass("as-destination-root") ||
          n.hasClass("is-hovered") ||
          n.hasClass("highlighted") ||
          n.selected();

        circles.push({ id: n.id(), x, y, r, color, strong });
      }

      const key = circles
        .map(
          (c) =>
            `${c.id}:${Math.round(c.x)}:${Math.round(c.y)}:${Math.round(c.r)}:${c.strong ? 1 : 0}`
        )
        .join("|");

      if (key !== lastGlowKeyRef.current) {
        lastGlowKeyRef.current = key;
        setGlowCircles(circles);
      }
    });
  }, [cyRef, wrapperRef]);

  return {
    glowCircles,
    scheduleGlowUpdate,
    resetGlow,
    glowRafRef: rafGlowRef,
  };
}
