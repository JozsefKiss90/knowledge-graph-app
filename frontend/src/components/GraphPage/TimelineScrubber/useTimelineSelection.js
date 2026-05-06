import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Manages the selected range within the timeline bar chart.
 *
 * @param {number} bucketCount - total number of month buckets
 * @returns selection state + pointer event handlers
 */
export function useTimelineSelection(bucketCount) {
  const [range, setRange] = useState({ start: 0, end: Math.max(0, bucketCount - 1) });

  // Reset range when bucket count changes (layer change)
  useEffect(() => {
    setRange({ start: 0, end: Math.max(0, bucketCount - 1) });
  }, [bucketCount]);

  const dragRef = useRef(null);
  // dragRef.current = { edge: 'left'|'right'|'body', originIdx, originRange }

  const clamp = useCallback(
    (idx) => Math.max(0, Math.min(bucketCount - 1, Math.round(idx))),
    [bucketCount]
  );

  const startDrag = useCallback(
    (edge, pointerIdx) => {
      dragRef.current = {
        edge,
        originIdx: pointerIdx,
        originRange: { ...range },
      };
    },
    [range]
  );

  const onDragMove = useCallback(
    (currentIdx) => {
      const drag = dragRef.current;
      if (!drag) return;

      const delta = currentIdx - drag.originIdx;

      if (drag.edge === "left") {
        const newStart = clamp(drag.originRange.start + delta);
        setRange((prev) => ({
          start: Math.min(newStart, prev.end),
          end: prev.end,
        }));
      } else if (drag.edge === "right") {
        const newEnd = clamp(drag.originRange.end + delta);
        setRange((prev) => ({
          start: prev.start,
          end: Math.max(prev.start, newEnd),
        }));
      } else if (drag.edge === "body") {
        const span = drag.originRange.end - drag.originRange.start;
        let newStart = clamp(drag.originRange.start + delta);
        let newEnd = newStart + span;
        if (newEnd > bucketCount - 1) {
          newEnd = bucketCount - 1;
          newStart = newEnd - span;
        }
        if (newStart < 0) {
          newStart = 0;
          newEnd = span;
        }
        setRange({ start: clamp(newStart), end: clamp(newEnd) });
      }
    },
    [clamp, bucketCount]
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const isDragging = useCallback(() => dragRef.current !== null, []);

  const jumpTo = useCallback(
    (idx) => {
      const clamped = clamp(idx);
      // Place a small 2-month window centered on the click
      const half = 1;
      setRange({
        start: clamp(clamped - half),
        end: clamp(clamped + half),
      });
    },
    [clamp]
  );

  return {
    range,
    setRange,
    startDrag,
    onDragMove,
    endDrag,
    isDragging,
    jumpTo,
  };
}
