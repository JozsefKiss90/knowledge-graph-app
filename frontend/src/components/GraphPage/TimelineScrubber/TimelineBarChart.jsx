import React, { useCallback, useEffect, useRef, useState } from "react";

const BAR_GAP = 1;
const AXIS_HEIGHT = 18;
const HANDLE_HIT = 10;
const TOP_PAD = 4;
const BAR_RADIUS = 2.5;

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
          {/* Gradient + glow defs */}
          <defs>
            {/* Closed (blue) */}
            <linearGradient id="tl-grad-closed" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgba(41,110,210,0.55)" />
              <stop offset="100%" stopColor="rgba(80,165,255,0.8)" />
            </linearGradient>
            {/* Open (green) */}
            <linearGradient id="tl-grad-open" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgba(30,160,90,0.65)" />
              <stop offset="100%" stopColor="rgba(60,220,140,0.95)" />
            </linearGradient>
            {/* Upcoming (yellow) */}
            <linearGradient id="tl-grad-upcoming" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgba(200,150,30,0.6)" />
              <stop offset="100%" stopColor="rgba(255,210,80,0.92)" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="tl-glow-closed" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="tl-glow-open" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="tl-glow-upcoming" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Selection overlay background */}
          <rect
            x={selX}
            y={0}
            width={selW}
            height={chartHeight}
            className="timeline-chart__selection-bg"
            rx={4}
          />

          {/* Bars */}
          {buckets.map((b, i) => {
            if (b.count === 0) return null;
            const x = i * step + BAR_GAP / 2;
            const h = Math.max(2, (b.count / maxCount) * barAreaHeight);
            const y = chartHeight - h;

            let fill, filterUrl;
            if (b.status === "open") {
              fill = "url(#tl-grad-open)";
              filterUrl = "url(#tl-glow-open)";
            } else if (b.status === "upcoming") {
              fill = "url(#tl-grad-upcoming)";
              filterUrl = "url(#tl-glow-upcoming)";
            } else {
              fill = "url(#tl-grad-closed)";
              filterUrl = "url(#tl-glow-closed)";
            }

            return (
              <rect
                key={b.key}
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={BAR_RADIUS}
                fill={fill}
                filter={filterUrl}
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
            rx={4}
          />

          {/* Left drag handle hit area */}
          <rect
            x={selX - HANDLE_HIT / 2}
            y={0}
            width={HANDLE_HIT}
            height={chartHeight}
            fill="transparent"
            style={{ cursor: "ew-resize" }}
          />
          <line
            x1={selX}
            y1={4}
            x2={selX}
            y2={chartHeight - 4}
            className="timeline-chart__handle-line"
          />

          {/* Right drag handle hit area */}
          <rect
            x={selX + selW - HANDLE_HIT / 2}
            y={0}
            width={HANDLE_HIT}
            height={chartHeight}
            fill="transparent"
            style={{ cursor: "ew-resize" }}
          />
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
