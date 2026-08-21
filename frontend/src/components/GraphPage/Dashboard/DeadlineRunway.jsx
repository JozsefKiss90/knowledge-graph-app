import React, { useMemo } from "react";

/**
 * Deadline runway — a horizontal "when do the calls above close" timeline.
 *
 * Plots the close dates of the calls currently shown in the Open & upcoming calls list as
 * colour-coded dots along a Today → N-week axis: green for open calls, amber for anything closing
 * within 10 days. Calls that land on (nearly) the same day are merged into one dot carrying a count
 * badge, and anything past the visible horizon is summarised as a "+N beyond" pill. Three summary
 * tiles below read the same set (next deadline, closing ≤14 days, open within 90 days).
 *
 * It intentionally derives everything from the `calls` it is handed (the very rows above it), so
 * filtering the list re-shapes the runway in lock-step. Display-only: no verdicts, just the shape of
 * the deadlines. Restyled to the blue-glass dashboard design.
 *
 * The plot is decorative-with-a-name (`role="img"` + a summary label): everything it encodes —
 * call names, deadline distances, cluster counts and the beyond-horizon overflow — is repeated
 * verbatim in the disclosure below it, so nothing is reachable only by hovering a dot, reading a
 * `title`, or telling green from amber.
 */

const DAY = 86400000;
const HORIZON_DAYS = 84; // 12 weeks — the default visible window
const MIN_WEEKS = 6;
const MAX_WEEKS = 12;
const INSET = 2; // keep the first/last markers off the very edges of the track (percent)
const MERGE_FRAC = 0.045; // merge dots closer than this fraction of the track into one cluster

const OPEN = "#35d07f";
const CLOSING = "#f3b84b";

// Whole days from now until a deadline (rounded); null when there's no parseable date.
function daysUntil(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((date.getTime() - Date.now()) / DAY);
}

// Tight label for the next-deadline tile — trims to a word boundary so it doesn't cut mid-word;
// CSS ellipsis still guards the rare very-long single word.
function shortName(label, id) {
  const s = String(label || id || "Call").trim();
  if (s.length <= 20) return s;
  let cut = s.slice(0, 20);
  const sp = cut.lastIndexOf(" ");
  if (sp >= 10) cut = cut.slice(0, sp);
  return `${cut.trimEnd()}…`;
}

// Map a 0..1 position on the axis to a percent left, inset from both ends so markers never clip.
function pos(frac) {
  return `${(INSET + frac * (100 - 2 * INSET)).toFixed(2)}%`;
}

// Deadline distance in words. A cluster spanning several days keeps both ends; a single
// deadline passes one day and reads "in 12 days" / "today" / "tomorrow".
function distance(minDays, maxDays = minDays) {
  if (minDays !== maxDays) return `in ${minDays}–${maxDays} days`;
  if (minDays === 0) return "today";
  if (minDays === 1) return "tomorrow";
  return `in ${minDays} days`;
}

const callName = (c) => c.label || c.id || "Untitled call";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function DeadlineRunway({ calls }) {
  const model = useMemo(() => {
    const future = (calls || [])
      .map((c) => ({ call: c, days: daysUntil(c.closeDate) }))
      .filter((x) => x.days != null && x.days >= 0)
      .sort((a, b) => a.days - b.days);

    if (future.length === 0) return null;

    // Fit the window to the data: tighten to the farthest visible call, but never past 12 weeks —
    // beyond that, cap the axis and roll the rest into a "+N beyond" pill.
    const farthest = future[future.length - 1].days;
    let weeks;
    let beyond = 0;
    if (farthest <= HORIZON_DAYS) {
      weeks = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Math.ceil(farthest / 7) || MIN_WEEKS));
    } else {
      weeks = MAX_WEEKS;
      beyond = future.filter((x) => x.days > HORIZON_DAYS).length;
    }
    const horizonDays = weeks * 7;
    const within = future.filter((x) => x.days <= horizonDays);

    // Greedy proximity clustering along the axis (calls closing ~the same day share a dot).
    const clusters = [];
    within.forEach((x) => {
      const frac = x.days / horizonDays;
      const last = clusters[clusters.length - 1];
      if (last && frac - last.meanFrac <= MERGE_FRAC) {
        last.items.push(x);
        last.sumFrac += frac;
        last.meanFrac = last.sumFrac / last.items.length;
        last.maxDays = x.days; // items arrive sorted, so this is the cluster's latest
      } else {
        clusters.push({ items: [x], sumFrac: frac, meanFrac: frac, minDays: x.days, maxDays: x.days });
      }
    });

    const dots = clusters.map((cl, i) => {
      const urgent = cl.minDays <= 10;
      return {
        key: i,
        left: pos(cl.meanFrac),
        color: urgent ? CLOSING : OPEN,
        glow: urgent ? "0 0 10px rgba(243,184,75,0.55)" : "0 0 10px rgba(53,208,127,0.5)",
        label: cl.minDays === cl.maxDays ? `${cl.minDays}d` : `${cl.minDays}-${cl.maxDays}d`,
        badge: cl.items.length > 1 ? cl.items.length : null,
        title: cl.items.map((it) => it.call.label || it.call.id).join("\n"),
      };
    });

    // The textual equivalent of the plot: one entry per dot, in the same left-to-right order,
    // carrying what the dot only shows (names, distance, how many share the marker, urgency).
    const entries = clusters.map((cl, i) => {
      const dist = distance(cl.minDays, cl.maxDays);
      const urgent = cl.minDays <= 10 ? " · closing within 10 days" : "";
      const names = cl.items.map((it) => callName(it.call));
      const text =
        names.length === 1
          ? `${names[0]} closes ${dist}`
          : `${plural(names.length, "call")} close ${dist}: ${names.join(", ")}`;
      return { key: `c${i}`, text: `${text}${urgent}` };
    });
    if (beyond > 0) {
      entries.push({
        key: "beyond",
        text: `${plural(beyond, "call")} ${beyond === 1 ? "closes" : "close"} beyond the next ${weeks} weeks`,
      });
    }

    const ticks = [];
    for (let w = 0; w <= weeks; w++) {
      ticks.push({ left: pos(w / weeks), label: w === 0 ? "Today" : `${w}w` });
    }

    const next = future[0];

    // The plot's accessible name: how many deadlines it draws, over what window, and the one
    // that matters first. The per-dot detail lives in the disclosure below, not here.
    const summary =
      `Deadline runway: ${plural(within.length, "call")} plotted over the next ${weeks} weeks` +
      `${beyond > 0 ? `, ${plural(beyond, "call")} beyond` : ""}. ` +
      `Next deadline: ${callName(next.call)} ${distance(next.days)}.`;

    const closing14 = future.filter((x) => x.days <= 14).length;
    const within90 = future.filter((x) => x.days <= 90).length;
    const stats = [
      { l: "NEXT DEADLINE", v: `${shortName(next.call.label, next.call.id)} · ${next.days}d`, c: "var(--d2-accent-text)" },
      { l: "CLOSING ≤ 14 DAYS", v: plural(closing14, "call"), c: "var(--d2-amber)" },
      { l: "OPEN WITHIN 90 DAYS", v: plural(within90, "call"), c: "var(--d2-open)" },
    ];

    return { weeks, dots, ticks, stats, beyond, entries, summary, total: future.length };
  }, [calls]);

  return (
    <div className="dash-card dash-runway">
      <div className="dash-runway__head">
        <div className="dash-runway__headings">
          <h3 className="dash-runway__title">Deadline runway</h3>
          <span className="dash-runway__sub">
            When the calls above close{model ? ` · next ${model.weeks} weeks` : ""}
          </span>
        </div>
        <span className="dash-runway__grow" />
        <span className="dash-runway__legend">
          <span className="dash-runway__legend-dot" style={{ background: OPEN }} />
          Open
        </span>
        <span className="dash-runway__legend">
          <span className="dash-runway__legend-dot" style={{ background: CLOSING }} />
          Closing &le;10d
        </span>
        {model && model.beyond > 0 && (
          <span className="dash-runway__beyond">+{model.beyond} beyond</span>
        )}
      </div>

      {model ? (
        <>
          <div className="dash-runway__track" role="img" aria-label={model.summary}>
            <div className="dash-runway__axis" />
            {model.ticks.map((t, i) => (
              <React.Fragment key={`t${i}`}>
                <span className="dash-runway__tick" style={{ left: t.left }} />
                <span className="dash-runway__tick-label" style={{ left: t.left }}>
                  {t.label}
                </span>
              </React.Fragment>
            ))}
            {model.dots.map((d) => (
              <React.Fragment key={`d${d.key}`}>
                <span className="dash-runway__dot-label" style={{ left: d.left, color: d.color }}>
                  {d.label}
                </span>
                <span
                  className="dash-runway__dot"
                  style={{ left: d.left, background: d.color, boxShadow: d.glow }}
                  title={d.title}
                />
                {d.badge && (
                  <span className="dash-runway__badge" style={{ left: d.left }}>
                    {d.badge}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Same content as the plot, in words: keyboard- and touch-reachable, and the only
              channel that survives without colour, hover or the `title` attribute. */}
          {/* aria-label because Chrome does not take a details' name from its summary. */}
          <details className="dash-runway__equiv" aria-label={`All ${model.total} deadlines in view`}>
            <summary className="dash-runway__equiv-summary">
              All {model.total} deadlines in view
            </summary>
            <ul className="dash-runway__equiv-list">
              {model.entries.map((e) => (
                <li key={e.key}>{e.text}</li>
              ))}
            </ul>
          </details>

          <div className="dash-runway__stats">
            {model.stats.map((s) => (
              <div className="dash-runway__stat" key={s.l}>
                <span className="dash-runway__stat-label">{s.l}</span>
                <span className="dash-runway__stat-value" style={{ color: s.c }}>
                  {s.v}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="dash-runway__empty">No upcoming deadlines in view</div>
      )}
    </div>
  );
}
