// src/components/GraphPage/Home/LandingHome.jsx
//
// Home v1 (PHASE-PLAN Step 5 · UX-DECISIONS Q6.3) — the orientation +
// monitoring-lite layer that turns the raw ROOT graph into the product's thesis.
// A left-docked glass card that floats over the canvas at the ROOT level only
// (it unmounts the moment the user drills into a programme), carrying:
//
//   1. the one-liner + a primary "Find open calls" path,
//   2. a "Funding landscape" entry teased with one LIVE example (real CORDIS
//      funded totals) that links to the landscape section (B5 field explorer),
//   3. a global "Closing soon" list computed from the loaded call deadlines —
//      real monitoring value with ZERO user state.
//
// Honesty contract (ADR-0006): the funded figures only appear once real CORDIS
// data is ingested; before that the landscape entry shows an honest empty line,
// never zeros. The word "graph" never appears in the copy (mechanism stays the
// internal codename — CLAUDE.md brand constraints).

import React from "react";

import { useDashboardData } from "../Dashboard/useDashboardData";
import useCordisPortfolio from "../Dashboard/useCordisPortfolio";
import { FindCallsIcon, ChevronRightIcon } from "../ui/railIcons";

// ── Small, self-contained formatters (kept local so the card owns its display) ──
function euro(v) {
  const n = Number(v) || 0;
  if (n >= 1e9) return `€${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  if (n >= 1e6) return `€${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `€${(n / 1e3).toFixed(0)}K`;
  return `€${n.toLocaleString()}`;
}
function count(v) {
  return (Number(v) || 0).toLocaleString();
}
function daysUntil(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((date.getTime() - Date.now()) / 86400000);
}
function relDeadline(days, d) {
  if (days == null) return "—";
  if (days < 0) return "closed";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 60) return `in ${days} days`;
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

export default function LandingHome({
  loadFromStore,
  onFindCalls,
  onOpenLandscape,
  onLocateCall,
}) {
  const data = useDashboardData(loadFromStore);
  const cordis = useCordisPortfolio();

  // Gate the funded figures on real data: an empty graph yields an all-zero
  // summary, so we fall back to the honest empty line rather than a row of zeros.
  const cordisActive = !!cordis.data && (cordis.data.projectCount || 0) > 0;

  // "Closing soon" — the soonest-closing open/upcoming calls (already sorted by
  // deadline in useDashboardData). Zero user state: it's a pure read of the
  // loaded deadlines.
  const closingSoon = (data.upcomingCalls || []).slice(0, 5);

  return (
    <aside className="kg-home" aria-label="Home — orientation and what's closing soon">
      {/* ── Thesis + primary path ── */}
      <div className="kg-home__intro">
        <p className="kg-home__eyebrow">European research funding</p>
        <h1 className="kg-home__headline">
          Open calls, and the real record of who&rsquo;s been funded
          <span className="kg-home__headline-accent"> — in one place.</span>
        </h1>
        <p className="kg-home__sub">
          Find the Horizon Europe call worth committing to, then see the funded
          track record in that area before you spend a season on a bid.
        </p>
        <button type="button" className="kg-home__cta" onClick={onFindCalls}>
          <FindCallsIcon size={16} />
          <span className="kg-home__cta-label">Find open calls</span>
          {data.openCalls > 0 && (
            <span className="kg-home__cta-count">{count(data.openCalls)} open now</span>
          )}
        </button>
      </div>

      {/* ── Funding landscape entry (teased with one live CORDIS example) ── */}
      <button
        type="button"
        className="kg-home__landscape"
        onClick={onOpenLandscape}
        aria-label="Explore the funding landscape by research field"
      >
        <span className="kg-home__section-label">
          <span>Funding landscape</span>
          <ChevronRightIcon size={13} className="kg-home__section-chev" />
        </span>

        {cordisActive ? (
          <>
            <span className="kg-home__stats">
              <span className="kg-home__stat">
                <b>{count(cordis.data.projectCount)}</b>
                <small>funded projects</small>
              </span>
              <span className="kg-home__stat">
                <b>{euro(cordis.data.totalEcContribution)}</b>
                <small>EU awarded</small>
              </span>
              <span className="kg-home__stat">
                <b>{count(cordis.data.organisationCount)}</b>
                <small>organisations</small>
              </span>
            </span>
            <span className="kg-home__landscape-foot">
              <span className="kg-home__src">Source: EU CORDIS</span>
              <span className="kg-home__landscape-go">Explore by research field →</span>
            </span>
          </>
        ) : (
          <span className="kg-home__landscape-empty">
            The funded track record appears here once EU CORDIS data is ingested —
            real awarded euros and organisations, never estimates.
          </span>
        )}
      </button>

      {/* ── Closing soon (real deadlines, zero user state) ── */}
      <div className="kg-home__closing">
        <div className="kg-home__section-label kg-home__section-label--static">
          Closing soon
        </div>
        <div className="kg-home__closing-list">
          {closingSoon.length === 0 && (
            <div className="kg-home__empty">No open calls with upcoming deadlines.</div>
          )}
          {closingSoon.map((c) => {
            const days = daysUntil(c.closeDate);
            const urgent = days != null && days >= 0 && days <= 10;
            return (
              <button
                type="button"
                className="kg-home__call"
                key={c.id}
                onClick={() => onLocateCall?.(c.id)}
                title={c.label || c.id}
              >
                <span
                  className="kg-home__call-dot"
                  style={{ backgroundColor: c.programmeColor }}
                />
                <span className="kg-home__call-main">
                  <span className="kg-home__call-name">{c.label || c.id}</span>
                  <span className="kg-home__call-prog">{c.programmeLabel}</span>
                </span>
                <span
                  className={`kg-home__call-when${urgent ? " is-urgent" : ""}`}
                >
                  {relDeadline(days, c.closeDate)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
