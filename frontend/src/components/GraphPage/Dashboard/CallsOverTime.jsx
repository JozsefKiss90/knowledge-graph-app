import React, { useState, useMemo } from "react";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Palette aligned with the blue-glass dashboard: open calls read green, closed read blue
// (the mockup's Calls-over-time legend), matching the landing-page timeline's colour language.
const OPEN = "#35d07f";
const CLOSED = "#4f7dc9";

/**
 * Calls over time — the dashboard's monthly area chart. This is intentionally the same component as
 * before (a duplicate of the landing page's "Calls over time"); only its card chrome and palette are
 * aligned to the redesigned dashboard. Toggles between open+forthcoming and closed counts.
 */
export default function CallsOverTime({ monthlyBuckets }) {
  const [mode, setMode] = useState("open"); // "open" | "closed"
  const year = new Date().getFullYear();
  const accent = mode === "open" ? OPEN : CLOSED;

  const { points, areaPath, linePath } = useMemo(() => {
    if (!monthlyBuckets || monthlyBuckets.length === 0) {
      return { points: [], areaPath: "", linePath: "" };
    }

    const values = monthlyBuckets.map((b) =>
      mode === "open" ? b.openCount + b.upcomingCount : b.closedCount
    );
    const max = Math.max(...values, 1);

    const W = 100;
    const H = 100;
    const padY = 5;
    const usableH = H - padY * 2;

    const pts = values.map((v, i) => ({
      x: (i / (values.length - 1)) * W,
      y: padY + usableH - (v / max) * usableH,
      value: v,
    }));

    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const area = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;

    return { points: pts, areaPath: area, linePath: line };
  }, [monthlyBuckets, mode]);

  return (
    <div className="dash-card dash-calls-time">
      <div className="dash-card__header dash-calls-time__head">
        <h3 className="dash-card__title">Calls over time</h3>
        <span className="dash-calls-time__year">{year}</span>
        <span className="dash-calls-time__grow" />
        <div className="dash-card__tabs dash-calls-time__tabs">
          <button
            type="button"
            className={`dash-card__tab${mode === "open" ? " dash-card__tab--active" : ""}`}
            onClick={() => setMode("open")}
          >
            <span className="dash-dot dash-dot--open" /> Open
          </button>
          <button
            type="button"
            className={`dash-card__tab${mode === "closed" ? " dash-card__tab--active" : ""}`}
            onClick={() => setMode("closed")}
          >
            <span className="dash-dot dash-dot--closed" /> Closed
          </button>
        </div>
      </div>
      <div className="dash-calls-time__chart">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="dash-calls-time__svg">
          <defs>
            <linearGradient id="dashAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.45" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.03" />
            </linearGradient>
          </defs>
          {areaPath && (
            <>
              <path d={areaPath} fill="url(#dashAreaGrad)" />
              <path
                d={linePath}
                fill="none"
                stroke={accent}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>
        <div className="dash-calls-time__labels">
          {MONTH_LABELS.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
