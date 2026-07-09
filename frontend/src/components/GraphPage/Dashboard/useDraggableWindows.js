import { useCallback, useEffect, useRef, useState } from "react";

// Keep at least this many px of a dragged window's top-left corner (its grab
// header) on-screen, so it can never be dragged fully out of reach.
const MIN_VISIBLE = 80;

/**
 * Multi-window drag/focus manager for the Portfolio Dashboard's "Explore by theme"
 * floating windows. Ports the mockup's `Component` class (the `Portfolio Dashboard.dc.html`
 * x-dc script) into an idiomatic React hook, and matches the repo's existing drag pattern
 * (pointer events + offset ref + viewport clamp, cf. useHoverCardDrag).
 *
 * State:
 *  - open: { [key]: bool }  — which windows are open
 *  - pos:  { [key]: {x,y} } — top-left of each window (viewport coords)
 *  - top:  string          — the focused key (raised z-index)
 *
 * A single global pointermove/pointerup pair drives dragging from a window's grab header.
 * `startDrag` records the cursor→window offset and focuses the window; moves are clamped to
 * `Math.max(8, …)` so a window can't be dragged fully off-screen.
 *
 * `mkWin(key)` returns the per-window view-model the DashWindow shell consumes
 * ({ open, left, top, z, onDrag, onClose, onFocus }) — mirrors the mockup's `mkWin`.
 *
 * @param {string[]} keys          window keys (e.g. ["funding","geography",…])
 * @param {object}   initialPos    { [key]: {x,y} } starting positions
 */
export default function useDraggableWindows(keys, initialPos = {}) {
  const [open, setOpen] = useState(() =>
    Object.fromEntries(keys.map((k) => [k, false]))
  );
  const [pos, setPos] = useState(() => {
    const seeded = {};
    keys.forEach((k, i) => {
      seeded[k] = initialPos[k] || { x: 320 + i * 26, y: 150 + i * 22 };
    });
    return seeded;
  });
  const [top, setTop] = useState(keys[0]);

  // Mirror pos into a ref so startDrag (memoised with stable deps) reads the live position
  // at grab time without re-subscribing the global listeners on every move.
  const posRef = useRef(pos);
  posRef.current = pos;

  // { key, ox, oy } while a window is being dragged, else null.
  const dragRef = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return;
      e.preventDefault(); // avoid text selection / scroll while dragging
      const { key, ox, oy } = dragRef.current;
      // Clamp both edges so a window can't be dragged (fully) off any side.
      const maxX = Math.max(8, window.innerWidth - MIN_VISIBLE);
      const maxY = Math.max(8, window.innerHeight - MIN_VISIBLE);
      const x = Math.min(maxX, Math.max(8, e.clientX - ox));
      const y = Math.min(maxY, Math.max(8, e.clientY - oy));
      setPos((p) => ({ ...p, [key]: { x, y } }));
    };
    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
    };
  }, []);

  const focus = useCallback((key) => {
    setTop((t) => (t === key ? t : key));
  }, []);

  const toggle = useCallback((key) => {
    setOpen((o) => ({ ...o, [key]: !o[key] }));
    setTop(key);
  }, []);

  const close = useCallback((key) => {
    setOpen((o) => ({ ...o, [key]: false }));
  }, []);

  const startDrag = useCallback(
    (key, e) => {
      // Only left button initiates a drag; ignore drags that start on interactive controls
      // inside the header (e.g. the close button) so clicks aren't stolen.
      if (e.button !== 0) return;
      if (e?.target?.closest?.("button,a,[role='button'],input,select,textarea")) {
        // Still focus, but don't begin dragging from a control.
        setTop(key);
        return;
      }
      const p = posRef.current[key] || { x: 0, y: 0 };
      dragRef.current = { key, ox: e.clientX - p.x, oy: e.clientY - p.y };
      document.body.style.userSelect = "none";
      setTop(key);
    },
    []
  );

  const mkWin = useCallback(
    (key) => ({
      open: !!open[key],
      left: (pos[key] || { x: 0, y: 0 }).x,
      top: (pos[key] || { x: 0, y: 0 }).y,
      z: top === key ? 90 : 60,
      onDrag: (e) => startDrag(key, e),
      onClose: () => close(key),
      onFocus: () => focus(key),
    }),
    [open, pos, top, startDrag, close, focus]
  );

  return { open, toggle, close, focus, mkWin };
}
