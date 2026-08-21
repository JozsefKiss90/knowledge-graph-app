import React from "react";
import { Link } from "react-router-dom";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import { getDatasetConfigForId } from "../../NodeDetalParts/useNodeDetail";
import MoneyBadge from "../../common/MoneyBadge";
import { NEXT_DEADLINES_SLICE } from "./useDashboardData";

function formatDate(d) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBudget(val) {
  if (!val || val === 0) return "—";
  if (val >= 1e6) return `€${(val / 1e6).toFixed(0)}M`;
  if (val >= 1e3) return `€${(val / 1e3).toFixed(0)}K`;
  return `€${val.toLocaleString()}`;
}

// Days from now until the deadline (rounded). null when there's no parseable date.
function daysUntil(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((date.getTime() - Date.now()) / 86400000);
}

// Human-friendly relative deadline ("in 6 days"); falls back to the absolute date when far out.
function relDeadline(days, d) {
  if (days == null) return "—";
  if (days < 0) return "closed";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 60) return `in ${days} days`;
  return formatDate(d);
}

// rgba glow tint for the programme dot (skips non-hex colours gracefully).
function glow(hex) {
  if (typeof hex !== "string" || hex[0] !== "#" || hex.length < 7) {
    return "rgba(117,81,255,0.18)";
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.18)`;
}

// Truthful status pill (ADR-0006): a call whose opening date is still in the future is
// "Forthcoming" — never "Open" — and only a truly open call can be "Closing".
function statusPill(status, days) {
  if (status === "upcoming") return { text: "Forthcoming", cls: "is-forthcoming" };
  if (days != null && days >= 0 && days <= 10) return { text: "Closing", cls: "is-closing" };
  return { text: "Open", cls: "is-open" };
}

/**
 * Open / forthcoming calls list — the top of the monitoring hierarchy. Rendered as an
 * ARIA table (the grid CSS stays on divs) so the collection is navigable by assistive
 * technology, while preserving all original behaviour: node-detail Link (with router state +
 * localStorage graphName write + encodeURIComponent), the locate-in-funding-map action, and
 * the honest empty state.
 *
 * The "Next 8 / Closing 30d" filter chips drive `callFilter` via `onSetFilter`
 * (null → the default next-deadlines slice, "closing30" → calls closing within 30 days) and
 * carry `aria-pressed` selected state. The wider "all open & forthcoming" filter ("open")
 * stays reachable from the Saved window's quick filters.
 */
export default function OpenCallsTable({
  rows,
  setViewMode,
  onLocateCall,
  locateCall,
  filterLabel,
  callFilter,
  onSetFilter,
  openCount,
  forthcomingCount,
  totalCount,
}) {
  const list = rows || [];
  const hasFilterChips = typeof onSetFilter === "function";

  // Honest about both the slice ("next N of total") and the status split — forthcoming
  // calls are never folded into an "open" count.
  const subtitle =
    filterLabel ||
    (openCount != null
      ? `Next ${list.length} of ${(totalCount ?? list.length).toLocaleString()} by deadline · ${openCount.toLocaleString()} open · ${(forthcomingCount || 0).toLocaleString()} forthcoming`
      : `Sorted by deadline · ${list.length} shown`);

  return (
    <div className="dash-card dash-calls">
      <div className="dash-calls__head">
        <div className="dash-calls__headings">
          <h3 className="dash-calls__title">Open &amp; forthcoming calls</h3>
          <span className="dash-calls__sub">{subtitle}</span>
        </div>
        {/* The Budget column holds the work programme's indicative amounts on offer, never awarded
            euros (ADR-0006 #5). The column cell is too narrow for the pill, so frame the whole table
            here. */}
        <MoneyBadge kind="advertised" size="sm" className="dash-calls__moneynote" />
        <span className="dash-calls__grow" />
        {hasFilterChips && (
          <div className="dash-calls__toggle" role="group" aria-label="Filter calls">
            <button
              type="button"
              className={`dash-calls__seg${!callFilter ? " is-active" : ""}`}
              aria-pressed={!callFilter}
              onClick={() => onSetFilter(null)}
            >
              Next {NEXT_DEADLINES_SLICE}
            </button>
            <button
              type="button"
              className={`dash-calls__seg${callFilter === "closing30" ? " is-active" : ""}`}
              aria-pressed={callFilter === "closing30"}
              onClick={() => onSetFilter("closing30")}
            >
              Closing 30d
            </button>
          </div>
        )}
        {setViewMode && (
          <button
            type="button"
            className="dash-calls__viewmap"
            onClick={() => setViewMode("graph")}
          >
            View in funding map
            <ArrowOutwardIcon fontSize="inherit" className="dash-calls__viewmap-icon" />
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="dash-calls__empty">No calls match this view</div>
      ) : (
        <div role="table" aria-label="Open and forthcoming calls, sorted by deadline">
          <div role="rowgroup">
            <div className="dash-calls__colhead" role="row">
              <span role="columnheader">Call</span>
              <span
                role="columnheader"
                className="dash-calls__colhead--budget"
                aria-label="Budget — indicative, on offer"
              >
                Budget
              </span>
              <span role="columnheader" className="dash-calls__colhead--deadline">
                Deadline
              </span>
              <span role="columnheader" className="dash-calls__colhead--status">
                Status
              </span>
            </div>
          </div>

          <div className="dash-calls__rows" role="rowgroup">
            {list.map((c) => {
              const graphName = getDatasetConfigForId(c.id).graphName;
              const onGraph = !!(locateCall && locateCall(c.id));
              const days = daysUntil(c.closeDate);
              const pill = statusPill(c.status, days);
              return (
                <div className="dash-calls__row" role="row" key={c.id}>
                  <div className="dash-calls__call" role="cell">
                    <span
                      className="dash-calls__dot"
                      aria-hidden="true"
                      style={{
                        backgroundColor: c.programmeColor,
                        boxShadow: `0 0 0 3px ${glow(c.programmeColor)}`,
                      }}
                    />
                    <div className="dash-calls__call-text">
                      <Link
                        to={`/node/${encodeURIComponent(c.id)}`}
                        state={{ graphName, returnGraphName: graphName }}
                        onClick={() => localStorage.setItem("graphName", graphName)}
                        className="dash-calls__name"
                        title={c.label}
                      >
                        {c.label || c.id}
                      </Link>
                      <div className="dash-calls__id">{c.id}</div>
                    </div>
                  </div>

                  <div className="dash-calls__budget" role="cell">
                    {formatBudget(c.budget)}
                  </div>

                  <div className="dash-calls__deadline" role="cell">
                    <div className="dash-calls__deadline-rel">
                      {relDeadline(days, c.closeDate)}
                    </div>
                    <div className="dash-calls__prog">{c.programmeLabel}</div>
                  </div>

                  <div className="dash-calls__status" role="cell">
                    <span className={`dash-calls__pill ${pill.cls}`}>
                      <span className="dash-calls__pill-dot" />
                      {pill.text}
                    </span>
                    {onGraph && (
                      <button
                        type="button"
                        className="dash-calls__action"
                        aria-label={`Show ${c.label || c.id} in funding map`}
                        onClick={() => {
                          if (onLocateCall && onLocateCall(c.id)) setViewMode("graph");
                        }}
                      >
                        Show in funding map
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
