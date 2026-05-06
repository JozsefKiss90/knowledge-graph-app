import React from "react";
import { PROGRAMME_DISPLAY } from "./utils";

const POPOVER_WIDTH = 210;
const POPOVER_GAP = 10;

export default function TimelineHoverPopover({
  bucket,
  barCenterX,
  barTopY,
  chartWidth,
  chartHeight,
}) {
  if (!bucket || bucket.count === 0) return null;

  const programmes = Object.entries(bucket.byProgramme || {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (programmes.length === 0) return null;

  const maxCount = programmes[0][1];

  // Smart positioning: clamp popover within chart bounds
  let popoverLeft = barCenterX - POPOVER_WIDTH / 2;
  popoverLeft = Math.max(0, Math.min(chartWidth - POPOVER_WIDTH, popoverLeft));
  const pointerX = barCenterX - popoverLeft;

  const bottom = chartHeight - barTopY + POPOVER_GAP;

  return (
    <div
      className="timeline-popover"
      style={{
        position: "absolute",
        left: popoverLeft,
        bottom,
        width: POPOVER_WIDTH,
        pointerEvents: "none",
        zIndex: 30,
      }}
    >
      <div className="timeline-popover__header">
        <span className="timeline-popover__month">{bucket.label}</span>
        <span className="timeline-popover__total">
          {bucket.count} call{bucket.count !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="timeline-popover__rows">
        {programmes.map(([prog, count]) => {
          const display = PROGRAMME_DISPLAY[prog] || {
            label: prog,
            color: "#9CA3AF",
          };
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={prog} className="timeline-popover__row">
              <span
                className="timeline-popover__dot"
                style={{ background: display.color }}
              />
              <span className="timeline-popover__name">{display.label}</span>
              <span className="timeline-popover__bar">
                <span
                  className="timeline-popover__bar-fill"
                  style={{ width: `${pct}%`, background: display.color }}
                />
              </span>
              <span className="timeline-popover__count">{count}</span>
            </div>
          );
        })}
      </div>
      {/* Downward-pointing arrow anchored to the bar */}
      <div
        className="timeline-popover__pointer"
        style={{ left: pointerX }}
      />
    </div>
  );
}
