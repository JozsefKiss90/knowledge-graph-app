import React, { useState, useMemo } from "react";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function CallsOverTime({ monthlyBuckets }) {
  const [mode, setMode] = useState("open"); // "open" | "closed"

  const { maxCount, points, areaPath, linePath } = useMemo(() => {
    if (!monthlyBuckets || monthlyBuckets.length === 0) {
      return { maxCount: 1, points: [], areaPath: "", linePath: "" };
    }

    const values = monthlyBuckets.map((b) =>
      mode === "open" ? b.openCount + b.upcomingCount : b.closedCount
    );
    const max = Math.max(...values, 1);

    const W = 100;
    const H = 100;
    const padX = 0;
    const padY = 5;
    const usableW = W - padX * 2;
    const usableH = H - padY * 2;

    const pts = values.map((v, i) => ({
      x: padX + (i / (values.length - 1)) * usableW,
      y: padY + usableH - (v / max) * usableH,
      value: v,
    }));

    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const area = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;

    return { maxCount: max, points: pts, areaPath: area, linePath: line };
  }, [monthlyBuckets, mode]);

  return (
    <div className="dash-card dash-calls-time">
      <div className="dash-card__header">
        <div>
          <h3 className="dash-card__title">Calls over time</h3>
          <span className="dash-card__subtitle">
            Monthly count &middot; {new Date().getFullYear()}
          </span>
        </div>
        <div className="dash-card__tabs">
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
              <stop
                offset="0%"
                stopColor={mode === "open" ? "#22C55E" : "#F59E0B"}
                stopOpacity="0.45"
              />
              <stop
                offset="100%"
                stopColor={mode === "open" ? "#22C55E" : "#F59E0B"}
                stopOpacity="0.03"
              />
            </linearGradient>
          </defs>
          {areaPath && (
            <>
              <path d={areaPath} fill="url(#dashAreaGrad)" />
              <path
                d={linePath}
                fill="none"
                stroke={mode === "open" ? "#22C55E" : "#F59E0B"}
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
