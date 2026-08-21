import React, { useId, useState, useMemo } from "react";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Open calls read green, closed read blue — through the theme tokens, so both modes stay
// defined and the legend dot (styled from the same tokens) can't drift from the line.
// The two series are also told apart by stroke pattern, so the chart still reads when colour
// doesn't (print, low vision, forced colours).
const MODES = {
  open: {
    label: "Open & forthcoming",
    color: "var(--d2-open)",
    dash: "none",
    dotClass: "dash-dot--open",
  },
  closed: {
    label: "Closed",
    color: "var(--d2-closed)",
    dash: "5 3",
    dotClass: "dash-dot--closed",
  },
};

// The month a bucket stands for.
function bucketDate(b) {
  return b.date instanceof Date && !Number.isNaN(b.date.getTime()) ? b.date : null;
}

// "Jan", or "Jan '27" when the series crosses a year boundary — two bare "Jan"s in one
// table would be indistinguishable.
function monthLabel(b, withYear) {
  const d = bucketDate(b);
  if (!d) return String(b.label || "");
  const month = MONTH_NAMES[d.getMonth()];
  return withYear ? `${month} '${String(d.getFullYear()).slice(2)}` : month;
}

// The period actually plotted — derived from the buckets, never from "this calendar year",
// so the label can't outrun the data (ADR-0006: say what is shown, no more).
function periodLabel(buckets) {
  const first = bucketDate(buckets[0]);
  const last = bucketDate(buckets[buckets.length - 1]);
  if (!first || !last) return "";
  const y1 = first.getFullYear();
  const y2 = last.getFullYear();
  const m1 = MONTH_NAMES[first.getMonth()];
  const m2 = MONTH_NAMES[last.getMonth()];
  if (y1 !== y2) return `${m1} ${y1}–${m2} ${y2}`;
  return first.getMonth() === last.getMonth() ? `${m1} ${y1}` : `${m1}–${m2} ${y1}`;
}

/**
 * Calls over time — the dashboard's monthly area chart, toggling between the open-and-forthcoming
 * count and the closed count of the calls active in each month.
 *
 * The plot itself is `role="img"` with a generated title and summary; the same monthly numbers are
 * available as a real table under the chart, so the series is never SVG-and-colour only. The mode
 * controls carry `aria-pressed` and are ordinary buttons (keyboard-operable by construction), and
 * the period label is derived from the buckets rather than the calendar year.
 */
export default function CallsOverTime({ monthlyBuckets }) {
  const [mode, setMode] = useState("open"); // "open" | "closed"
  // useId yields ":r0:"-style values; strip the colons so the gradient's url(#…) reference and
  // the id attributes stay valid everywhere.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const series = MODES[mode];

  const { rows, areaPath, linePath, period, peak, total } = useMemo(() => {
    const buckets = monthlyBuckets || [];
    if (buckets.length === 0) {
      return { rows: [], areaPath: "", linePath: "", period: "", peak: null, total: 0 };
    }

    const first = bucketDate(buckets[0]);
    const last = bucketDate(buckets[buckets.length - 1]);
    const spansYears = !!first && !!last && first.getFullYear() !== last.getFullYear();

    const data = buckets.map((b) => ({
      key: b.key || b.label,
      label: monthLabel(b, spansYears),
      value:
        mode === "open"
          ? (b.openCount || 0) + (b.upcomingCount || 0)
          : b.closedCount || 0,
    }));
    const max = Math.max(...data.map((d) => d.value), 1);

    const W = 100;
    const H = 100;
    const padY = 5;
    const usableH = H - padY * 2;

    const pts = data.map((d, i) => ({
      x: data.length === 1 ? W / 2 : (i / (data.length - 1)) * W,
      y: padY + usableH - (d.value / max) * usableH,
    }));

    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const area = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;
    const top = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);

    return {
      rows: data,
      areaPath: area,
      linePath: line,
      period: periodLabel(buckets),
      peak: top,
      total: data.reduce((sum, d) => sum + d.value, 0),
    };
  }, [monthlyBuckets, mode]);

  // An all-zero series is not a chart: a flat line summarised as "highest 0 in Jan" dresses up
  // nothing as data (ADR-0006 §1). Say it plainly instead — the affordance stays, the state is
  // disclosed (§2).
  const hasData = rows.length > 0 && total > 0;
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const periodSuffix = period ? `, ${period}` : "";
  const description = hasData
    ? `${series.label} calls active in each month${periodSuffix}. ` +
      `Highest ${peak.value} in ${peak.label}. Monthly values are listed in the table below.`
    : "";

  return (
    <div className="dash-card dash-calls-time">
      <div className="dash-card__header dash-calls-time__head">
        <h3 className="dash-card__title">Calls over time</h3>
        {period && <span className="dash-calls-time__year">{period}</span>}
        <span className="dash-calls-time__grow" />
        <div
          className="dash-card__tabs dash-calls-time__tabs"
          role="group"
          aria-label="Series shown"
        >
          {Object.entries(MODES).map(([key, m]) => (
            <button
              key={key}
              type="button"
              className={`dash-card__tab${mode === key ? " dash-card__tab--active" : ""}`}
              aria-pressed={mode === key}
              onClick={() => setMode(key)}
            >
              <span className={`dash-dot ${m.dotClass}`} aria-hidden="true" /> {m.label}
            </button>
          ))}
        </div>
      </div>

      {hasData ? (
        <>
          <div className="dash-calls-time__chart">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="dash-calls-time__svg"
              role="img"
              aria-labelledby={titleId}
              aria-describedby={descId}
            >
              <title id={titleId}>Calls over time</title>
              <desc id={descId}>{description}</desc>
              <defs>
                <linearGradient id={`${uid}-grad`} x1="0" y1="0" x2="0" y2="1">
                  {/* `style` rather than the presentation attribute: only the CSS property
                      resolves a var(), which is what keeps the plot on the theme tokens. */}
                  <stop offset="0%" style={{ stopColor: series.color }} stopOpacity="0.45" />
                  <stop offset="100%" style={{ stopColor: series.color }} stopOpacity="0.03" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#${uid}-grad)`} />
              <path
                className="dash-calls-time__line"
                d={linePath}
                fill="none"
                style={{ stroke: series.color }}
                strokeWidth="1.5"
                strokeDasharray={series.dash}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="dash-calls-time__labels" aria-hidden="true">
              {rows.map((r) => (
                <span key={r.key}>{r.label}</span>
              ))}
            </div>
          </div>

          {/* The period lives in the header chip; the caption names the series, so neither the
              plot nor the legend is the only place the reader can learn what is drawn. */}
          <p className="dash-calls-time__caption">
            Showing {series.label.toLowerCase()} calls active in each month
          </p>

          <details className="dash-calls-time__values" aria-label="Monthly values">
            <summary className="dash-calls-time__values-summary">Monthly values</summary>
            <table
              className="dash-calls-time__table"
              aria-label={`Calls over time — ${series.label} calls per month${periodSuffix}`}
            >
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">{series.label}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <th scope="row">{r.label}</th>
                    <td>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <div className="dash-calls-time__empty">
          {rows.length === 0
            ? "No monthly call data in view"
            : `No ${series.label.toLowerCase()} calls in ${period || "this period"}`}
        </div>
      )}
    </div>
  );
}
