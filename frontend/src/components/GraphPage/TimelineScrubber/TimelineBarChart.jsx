import React, { useCallback, useEffect, useRef, useState } from "react";
import TimelineHoverPopover from "./TimelineHoverPopover";
import { axisTicks } from "./utils";

const BAR_GAP = 1;
const AXIS_HEIGHT = 18;
const HANDLE_HIT = 10;
const TOP_PAD = 4;
const BAR_RADIUS = 2.5;
const AXIS_PAD = 2;

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
  const [hoveredIdx, setHoveredIdx] = useState(null);

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
      setHoveredIdx(null);
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

  // Hover tracking
  const handleMouseMove = useCallback(
    (e) => {
      if (draggingRef.current) {
        setHoveredIdx(null);
        return;
      }
      const idx = Math.floor(xToIdx(e.clientX));
      setHoveredIdx(idx >= 0 && idx < count ? idx : null);
    },
    [xToIdx, count]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIdx(null);
  }, []);

  // Which months get a label, and whether it reads as a month or a year — see axisTicks.
  const ticks = axisTicks(buckets, size.width);

  const { start, end } = selectionRange;
  const selX = start * step;
  const selW = (end - start + 1) * step;

  // Popover positioning
  let popoverProps = null;
  if (
    hoveredIdx !== null &&
    hoveredIdx >= 0 &&
    hoveredIdx < count &&
    buckets[hoveredIdx]?.count > 0
  ) {
    const hb = buckets[hoveredIdx];
    const barH = Math.max(2, (hb.count / maxCount) * barAreaHeight);
    popoverProps = {
      bucket: hb,
      barCenterX: hoveredIdx * step + step / 2,
      barTopY: chartHeight - barH,
      chartWidth: size.width,
      chartHeight,
    };
  }

  return (
    <div
      ref={containerRef}
      className="timeline-chart"
      style={{ width: "100%", height: "100%", position: "relative" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {size.width > 0 && count > 0 && (
        <>
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

            {/* Year boundaries: the only structure a multi-year strip has, and cheaper
                to read than counting bars back to a label. */}
            {buckets.map((b, i) =>
              i > 0 && b.spansYears && b.date.getMonth() === 0 ? (
                <line
                  key={`yr-${b.key}`}
                  x1={i * step - BAR_GAP / 2}
                  y1={0}
                  x2={i * step - BAR_GAP / 2}
                  y2={chartHeight}
                  className="timeline-chart__year-line"
                />
              ) : null
            )}

            {/* Selection overlay background */}
            <rect
              x={selX}
              y={0}
              width={selW}
              height={chartHeight}
              className="timeline-chart__selection-bg"
              rx={4}
            />

            {/* Bars – stacked segments: closed (bottom), open (middle), forthcoming (top) */}
            {buckets.map((b, i) => {
              if (b.count === 0) return null;
              const x = i * step + BAR_GAP / 2;
              const totalH = Math.max(2, (b.count / maxCount) * barAreaHeight);
              const barBottom = chartHeight;

              // Build segments ordered bottom-to-top: closed, open, upcoming
              const segments = [
                { count: b.closedCount,  fill: "url(#tl-grad-closed)",  filter: "url(#tl-glow-closed)"  },
                { count: b.openCount,    fill: "url(#tl-grad-open)",    filter: "url(#tl-glow-open)"    },
                { count: b.upcomingCount, fill: "url(#tl-grad-upcoming)", filter: "url(#tl-glow-upcoming)" },
              ].filter(s => s.count > 0);

              let cursor = 0; // accumulated height from bottom
              return segments.map((seg, si) => {
                const segH = (seg.count / b.count) * totalH;
                const segY = barBottom - cursor - segH;
                cursor += segH;

                // Round top corners on topmost segment, bottom corners on bottommost
                const isBottom = si === 0;
                const isTop = si === segments.length - 1;

                if (segments.length === 1) {
                  return (
                    <rect
                      key={`${b.key}-${si}`}
                      x={x} y={segY} width={barW} height={segH}
                      rx={BAR_RADIUS}
                      fill={seg.fill} filter={seg.filter}
                    />
                  );
                }

                // For multi-segment bars, use clipPath-free rounded corners via path
                const r = BAR_RADIUS;
                const rTop = isTop ? r : 0;
                const rBot = isBottom ? r : 0;
                const w = barW;
                const h = segH;
                const path = `M${x + rBot},${segY + h}`
                  + ` Q${x},${segY + h} ${x},${segY + h - rBot}`
                  + ` L${x},${segY + rTop}`
                  + ` Q${x},${segY} ${x + rTop},${segY}`
                  + ` L${x + w - rTop},${segY}`
                  + ` Q${x + w},${segY} ${x + w},${segY + rTop}`
                  + ` L${x + w},${segY + h - rBot}`
                  + ` Q${x + w},${segY + h} ${x + w - rBot},${segY + h}`
                  + ` Z`;

                return (
                  <path
                    key={`${b.key}-${si}`}
                    d={path}
                    fill={seg.fill} filter={seg.filter}
                  />
                );
              });
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
            {ticks.map((t) => {
              const centre = t.index * step + step / 2;
              // A centred label on the first or last tick hangs off the edge and is
              // clipped by the viewBox — "JAN 2023" arrived as "N '23". Anchor those to
              // the edge instead. text-anchor is set in CSS, so it has to be overridden
              // as a style to win.
              const halfW = (t.text.length * 5.6) / 2;
              let x = centre;
              let anchor = "middle";
              if (centre - halfW < AXIS_PAD) {
                x = AXIS_PAD;
                anchor = "start";
              } else if (centre + halfW > size.width - AXIS_PAD) {
                x = size.width - AXIS_PAD;
                anchor = "end";
              }
              return (
                <text
                  key={`lbl-${t.key}`}
                  x={x}
                  y={size.height - 3}
                  style={{ textAnchor: anchor }}
                  className={`timeline-chart__axis-label${
                    t.isYear ? " timeline-chart__axis-label--year" : ""
                  }`}
                >
                  {t.text}
                </text>
              );
            })}
          </svg>

          {/* Hover popover */}
          {popoverProps && <TimelineHoverPopover {...popoverProps} />}
        </>
      )}
    </div>
  );
}
