import React, { useCallback, useEffect, useRef, useState } from "react";

const BAR_GAP = 1;
const AXIS_HEIGHT = 18;
const HANDLE_HIT = 10;
const TOP_PAD = 4;

export default function TimelineBarChart({
  buckets,
  selectionRange,
  onStartDrag,
  onDragMove,
  onEndDrag,
  onJumpTo,
}) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Measure the wrapper div (not the SVG)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ width: Math.floor(r.width), height: Math.floor(r.height) });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const count = buckets.length;
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const chartHeight = Math.max(0, size.height - AXIS_HEIGHT);
  const barAreaHeight = Math.max(0, chartHeight - TOP_PAD);
  const step = count > 0 ? size.width / count : 0;
  const barW = Math.max(0, step - BAR_GAP);

  // pixel X → fractional bucket index
  const xToIdx = useCallback(
    (clientX) => {
      const r = containerRef.current?.getBoundingClientRect();
      if (!r || count === 0) return 0;
      return (clientX - r.left) / step;
    },
    [step, count]
  );

  const draggingRef = useRef(false);

  const handlePointerDown = useCallback(
    (e) => {
      if (count === 0) return;

      const idx = xToIdx(e.clientX);
      const roundIdx = Math.max(0, Math.min(count - 1, Math.round(idx)));
      const { start, end } = selectionRange;

      const r = containerRef.current?.getBoundingClientRect();
      const relX = e.clientX - (r?.left || 0);
      const selLeft = start * step;
      const selRight = (end + 1) * step;

      if (Math.abs(relX - selLeft) < HANDLE_HIT) {
        onStartDrag("left", idx);
      } else if (Math.abs(relX - selRight) < HANDLE_HIT) {
        onStartDrag("right", idx);
      } else if (roundIdx >= start && roundIdx <= end) {
        onStartDrag("body", idx);
      } else {
        onJumpTo(roundIdx);
        return;
      }

      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [count, xToIdx, selectionRange, step, onStartDrag, onJumpTo]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!draggingRef.current) return;
      onDragMove(xToIdx(e.clientX));
    },
    [xToIdx, onDragMove]
  );

  const handlePointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onEndDrag();
  }, [onEndDrag]);

  // Axis label interval
  const labelInterval = count > 0
    ? Math.max(1, Math.ceil(count / Math.max(1, Math.floor(size.width / 52))))
    : 1;

  const { start, end } = selectionRange;
  const selX = start * step;
  const selW = (end - start + 1) * step;

  return (
    <div
      ref={containerRef}
      className="timeline-chart"
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      {size.width > 0 && count > 0 && (
        <svg
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          style={{ display: "block", cursor: "pointer", userSelect: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Selection overlay background */}
          <rect
            x={selX}
            y={0}
            width={selW}
            height={chartHeight}
            className="timeline-chart__selection-bg"
            rx={3}
          />

          {/* Bars */}
          {buckets.map((b, i) => {
            if (b.count === 0) return null;
            const x = i * step + BAR_GAP / 2;
            const h = Math.max(1, (b.count / maxCount) * barAreaHeight);
            const y = chartHeight - h;
            const isSelected = i >= start && i <= end;

            return (
              <rect
                key={b.key}
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={1}
                className={
                  isSelected
                    ? "timeline-chart__bar timeline-chart__bar--selected"
                    : "timeline-chart__bar"
                }
              />
            );
          })}

          {/* Selection border */}
          <rect
            x={selX}
            y={0}
            width={selW}
            height={chartHeight}
            className="timeline-chart__selection-border"
            rx={3}
          />

          {/* Left drag handle (invisible hit area) */}
          <rect
            x={selX - HANDLE_HIT / 2}
            y={0}
            width={HANDLE_HIT}
            height={chartHeight}
            fill="transparent"
            style={{ cursor: "ew-resize" }}
          />
          {/* Left handle visual line */}
          <line
            x1={selX}
            y1={4}
            x2={selX}
            y2={chartHeight - 4}
            className="timeline-chart__handle-line"
          />

          {/* Right drag handle */}
          <rect
            x={selX + selW - HANDLE_HIT / 2}
            y={0}
            width={HANDLE_HIT}
            height={chartHeight}
            fill="transparent"
            style={{ cursor: "ew-resize" }}
          />
          {/* Right handle visual line */}
          <line
            x1={selX + selW}
            y1={4}
            x2={selX + selW}
            y2={chartHeight - 4}
            className="timeline-chart__handle-line"
          />

          {/* Axis labels */}
          {buckets.map((b, i) => {
            if (i % labelInterval !== 0) return null;
            const x = i * step + step / 2;
            return (
              <text
                key={`lbl-${b.key}`}
                x={x}
                y={size.height - 3}
                className="timeline-chart__axis-label"
              >
                {b.label}
              </text>
            );
          })}
        </svg>
      )}
    </div>
  );
}
