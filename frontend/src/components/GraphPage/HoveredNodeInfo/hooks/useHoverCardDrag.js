import { useEffect, useRef, useState } from "react";
import { PADDING } from "../utils/constants";

/**
 * Drag hook for the hover card.
 * - dragPos: null => use auto-positioning; otherwise fixed left/top
 * - startDrag: pointerdown handler (attach to shell/header)
 * - resetDrag: clears dragPos and internal dragging state
 */
export function useHoverCardDrag({ cardRef }) {
  const [dragPos, setDragPos] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const offsetRef = useRef({ dx: 0, dy: 0 });

  const resetDrag = () => {
    setDragPos(null);
    setIsDragging(false);
    offsetRef.current = { dx: 0, dy: 0 };
  };

  const startDrag = (e) => {
    // Do not steal clicks from interactive controls inside the card
    if (e?.target?.closest?.("button,a,[role='button'],input,textarea,select")) return;

    const rect = cardRef?.current?.getBoundingClientRect?.();
    if (!rect) return;

    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    offsetRef.current = {
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e) => {
      // prevent default to avoid text selection / unwanted scroll during drag
      e.preventDefault();

      const { dx, dy } = offsetRef.current;
      setDragPos({
        x: Math.max(PADDING, e.clientX - dx),
        y: Math.max(PADDING, e.clientY - dy),
      });
    };

    const onUp = () => setIsDragging(false);

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isDragging]);

  return { dragPos, startDrag, resetDrag, isDragging };
}
