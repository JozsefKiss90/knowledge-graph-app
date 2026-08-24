import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import useCordisTrend from "./useCordisTrend";
import CordisEmptyState from "./CordisEmptyState";

// Same € formatter as A2 (CordisEvidencePanel / the dashboard) — counts and euros are never mixed.
function formatBudget(val) {
  if (val >= 1e9) return `€${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `€${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `€${(val / 1e3).toFixed(0)}K`;
  if (val > 0) return `€${val.toLocaleString("en-GB")}`;
  return "—";
}

// Named EU framework programmes get a chronological colour ramp (oldest rose → newest green).
// Real CORDIS data also carries a long tail of non-FP / unclassified codes (CIP, COST, Euratom, empty,
// …) — those collapse into one neutral "Other programmes" bucket so the chart stays readable and honest.
const FP_META = {
  HORIZON: { label: "Horizon Europe", color: "#34d399", order: 9 },
  H2020:   { label: "Horizon 2020",   color: "#60a5fa", order: 8 },
  FP7:     { label: "FP7",            color: "#a78bfa", order: 7 },
  FP6:     { label: "FP6",            color: "#c084fc", order: 6 },
  FP5:     { label: "FP5",            color: "#e879f9", order: 5 },
  FP4:     { label: "FP4",            color: "#f472b6", order: 4 },
  FP3:     { label: "FP3",            color: "#fb7185", order: 3 },
  FP2:     { label: "FP2",            color: "#fda4af", order: 2 },
};
const OTHER_ERA = { label: "Other programmes", color: "#94a3b8", order: 100 };
const eraMeta = (fp) => FP_META[fp] || OTHER_ERA;
const eraKey = (fp) => (FP_META[fp] ? fp : "__other");

// Merge an array of era-ish records by display bucket (named FP or "Other"), summing counts/funding and
// widening the year span. Used for both the year-bar segments (byFp) and the era summary (data.eras).
function mergeByEra(items, { count = "count", funding = "funding", first = "firstYear", last = "lastYear" } = {}) {
  const m = new Map();
  for (const it of items) {
    const k = eraKey(it.fp);
    const cur = m.get(k) || {
      key: k, meta: eraMeta(it.fp), count: 0, funding: 0,
      firstYear: it[first], lastYear: it[last],
    };
    cur.count += it[count] || 0;
    cur.funding += it[funding] || 0;
    if (it[first] != null) cur.firstYear = Math.min(cur.firstYear ?? it[first], it[first]);
    if (it[last] != null) cur.lastYear = Math.max(cur.lastYear ?? it[last], it[last]);
    m.set(k, cur);
  }
  return [...m.values()].sort((a, b) => a.meta.order - b.meta.order);
}

function Card({ children }) {
  return (
    <Box className="nd-card cordis-trend">
      <Box className="nd-card-header">
        <Typography variant="body2" className="nd-card-title nd-muted-label">
          Funding history (CORDIS)
        </Typography>
      </Box>
      <Box className="nd-card-body">{children}</Box>
    </Box>
  );
}

/**
 * A6 — funding-history trend for a call's SUBJECT area: how EU-funded activity has evolved by project
 * start year across framework-programme eras. Honest framing: this is the research area over time, NOT
 * the call's own budget or timeline. Hidden when CORDIS has no linked projects (same gate as A2).
 */
export default function CordisTrendPanel({ callId, bare = false }) {
  const { loading, data } = useCordisTrend(callId);
  const [measure, setMeasure] = useState("projects"); // "projects" | "funding"

  if (!callId || loading) return null;
  const emptyNote = bare ? (
    <div className="cordis-trend">
      <CordisEmptyState compact message="Not enough dated projects to chart a trend." />
    </div>
  ) : null;
  const count = data?.projectCount || 0;
  if (!data || count === 0) return emptyNote;

  const buckets = data.yearBuckets || [];
  if (buckets.length === 0) return emptyNote;

  // Only offer the EU-funding measure when there is funding to show; otherwise stay on Projects so we
  // never render an empty, unexplained funding chart (some CORDIS projects carry no EU contribution).
  const hasFunding = (data.totalEcContribution || 0) > 0;
  const isProjects = !hasFunding || measure === "projects";
  const metricOfYear = (b) => (isProjects ? b.count : b.funding) || 0;

  // Dense year axis first→last so gap years (and tail-off) are visible, not collapsed.
  const first = data.firstYear ?? buckets[0].year;
  const last = data.lastYear ?? buckets[buckets.length - 1].year;
  const byYear = new Map(buckets.map((b) => [b.year, b]));
  const years = [];
  for (let y = first; y <= last; y += 1) {
    years.push(byYear.get(y) || { year: y, count: 0, funding: 0, byFp: [] });
  }
  const maxMetric = Math.max(...years.map(metricOfYear), 1);

  // Label thinning: all labels when the span is short, else ~6 evenly spaced incl. first & last.
  const span = years.length;
  const labelStep = span <= 10 ? 1 : Math.ceil(span / 6);
  const showLabel = (i) => i === 0 || i === span - 1 || i % labelStep === 0;

  // Per-year render rows. Segments are filtered to the ACTIVE measure (drop eras with 0 in that
  // measure) so an era is never drawn as an invisible zero-height slice — keeping the chart and its
  // legend consistent. byFp carries no year span, so we skip first/last in mergeByEra.
  const yearRows = years.map((b, i) => {
    const yearMetric = metricOfYear(b);
    const barPct = yearMetric > 0 ? Math.max((yearMetric / maxMetric) * 100, 4) : 0;
    const segs = mergeByEra(
      (b.byFp || []).filter((s) => (isProjects ? s.n > 0 : s.funding > 0)),
      { count: "n", first: null, last: null }
    ).sort((a, c) => c.meta.order - a.meta.order); // newest era on top
    const composition = mergeByEra(b.byFp || [], { count: "n", first: null, last: null })
      .map((s) => s.meta.label)
      .join(", ");
    const tip =
      b.count > 0
        ? `${b.year} · ${b.count.toLocaleString("en-GB")} projects · ${formatBudget(b.funding)} · ${composition}`
        : `${b.year} · no funded projects`;
    return { b, i, yearMetric, barPct, segs, tip };
  });

  const eraBuckets = mergeByEra(data.eras || []); // full era record (both measures), for the summary
  const multiEra = eraBuckets.length > 1;
  // Legend mirrors exactly the eras actually drawn for the active measure (no legend/bar mismatch).
  const usedKeys = new Set(yearRows.flatMap((r) => r.segs.map((s) => s.key)));
  const legendEras = eraBuckets.filter((e) => usedKeys.has(e.key));

  // Honest, data-only summary — no "growing/declining" verdict.
  const spanText = first === last ? `in ${first}` : `spans ${first}–${last}`;
  const eraText = multiEra
    ? `across ${eraBuckets.length} EU programmes (${eraBuckets[0].meta.label} to ${eraBuckets[eraBuckets.length - 1].meta.label})`
    : `all under ${eraBuckets[0]?.meta.label || "one EU programme"}`;

  const body = (
    <>
      {!bare && (
        <div className="cordis-trend__hint">
          How EU-funded activity on this research area has evolved by project start year, across framework
          programmes — not this call's budget or timeline.
        </div>
      )}

      {hasFunding && (
        <div className="cordis-trend__toggle" role="group" aria-label="Measure">
          <button
            type="button"
            className={`cordis-trend__toggle-btn${isProjects ? " is-active" : ""}`}
            onClick={() => setMeasure("projects")}
          >
            Projects
          </button>
          <button
            type="button"
            className={`cordis-trend__toggle-btn${!isProjects ? " is-active" : ""}`}
            onClick={() => setMeasure("funding")}
          >
            EU funding
          </button>
        </div>
      )}

      <div className="cordis-trend__chart">
        <div className="cordis-trend__bars">
          {yearRows.map(({ b, i, yearMetric, barPct, segs, tip }) => (
            <div key={b.year} className="cordis-trend__col" title={tip}>
              <div className="cordis-trend__bar-area">
                <div className="cordis-trend__bar" style={{ height: `${barPct}%` }}>
                  {segs.map((s) => {
                    const segMetric = isProjects ? s.count : s.funding;
                    const segPct = yearMetric > 0 ? (segMetric / yearMetric) * 100 : 0;
                    return (
                      <div
                        key={s.key}
                        className="cordis-trend__seg"
                        style={{ height: `${segPct}%`, backgroundColor: s.meta.color }}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="cordis-trend__col-label">{showLabel(i) ? b.year : ""}</div>
            </div>
          ))}
        </div>
        <div className="cordis-trend__y-note">
          {isProjects ? "Funded projects per start year" : "EU funding per start year (€)"}
        </div>
      </div>

      {eraBuckets.length > 0 && (
        <>
          <div className="cordis-trend__legend">
            {legendEras.map((e) => (
              <span key={e.key} className="cordis-trend__legend-item">
                <span className="cordis-trend__swatch" style={{ backgroundColor: e.meta.color }} />
                {e.meta.label}
              </span>
            ))}
          </div>

          <div className="cordis-trend__section-label">By framework-programme era</div>
          <ul className="cordis-trend__eras">
            {eraBuckets.map((e) => (
              <li key={e.key} className="cordis-trend__era-row">
                <span className="cordis-trend__era-name">
                  <span className="cordis-trend__swatch" style={{ backgroundColor: e.meta.color }} />
                  {e.meta.label}
                  <span className="cordis-trend__era-span">
                    {e.firstYear === e.lastYear ? ` · ${e.firstYear}` : ` · ${e.firstYear}–${e.lastYear}`}
                  </span>
                </span>
                <span className="cordis-trend__era-val">
                  {e.count.toLocaleString("en-GB")} projects
                  <span className="cordis-trend__sub"> · {formatBudget(e.funding)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="cordis-trend__summary">
        Funded activity {spanText} {eraText}. Peak year {data.peakYear} ({(data.peakCount || 0).toLocaleString("en-GB")} projects).
        {data.undatedCount > 0 ? ` (+${data.undatedCount.toLocaleString("en-GB")} projects with no start date.)` : ""}
      </div>

      {!bare && (
        <div className="cordis-trend__prov">
          {data.provenance}
          {data.subject ? ` — “${data.subject}”` : ""}
        </div>
      )}
    </>
  );

  return bare ? <div className="cordis-trend">{body}</div> : <Card>{body}</Card>;
}
