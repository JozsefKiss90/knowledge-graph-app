import React from "react";
import { Link } from "react-router-dom";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import { getDatasetConfigForId } from "../../NodeDetalParts/useNodeDetail";
import MoneyBadge from "../../common/MoneyBadge";

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

/**
 * Open / upcoming calls list — restyled to the redesign mockup's row layout
 * (status dot · title+id · budget · deadline+programme · status pill) while preserving all
 * original behaviour: node-detail Link (with router state + localStorage graphName write +
 * encodeURIComponent), the "show in graph" locate action, and the empty state.
 *
 * The "All / Closing 30d" filter chips drive `callFilter` via `onSetFilter`
 * (null → default upcoming slice, "closing30" → calls closing within 30 days). The wider
 * "all open calls" filter ("open") stays reachable from the Saved window's quick filters.
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
  closingCount,
}) {
  const list = rows || [];
  const hasFilterChips = typeof onSetFilter === "function";

  const subtitle =
    filterLabel ||
    (openCount != null
      ? `Sorted by deadline · ${openCount.toLocaleString()} open · ${(closingCount || 0).toLocaleString()} closing in 30d`
      : `Sorted by deadline · ${list.length} shown`);

  return (
    <div className="dash-card dash-calls">
      <div className="dash-calls__head">
        <div className="dash-calls__headings">
          <h3 className="dash-calls__title">Open &amp; upcoming calls</h3>
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
              onClick={() => onSetFilter(null)}
            >
              All
            </button>
            <button
              type="button"
              className={`dash-calls__seg${callFilter === "closing30" ? " is-active" : ""}`}
              onClick={() => onSetFilter("closing30")}
            >
              Closing 30d
            </button>
          </div>
        )}
        {setViewMode && (
          <button
            type="button"
            className="dash-calls__viewgraph"
            onClick={() => setViewMode("graph")}
          >
            View on graph
            <ArrowOutwardIcon fontSize="inherit" className="dash-calls__viewgraph-icon" />
          </button>
        )}
      </div>

      <div className="dash-calls__colhead">
        <span>Call</span>
        <span className="dash-calls__colhead--budget">Budget</span>
        <span className="dash-calls__colhead--deadline">Deadline</span>
        <span className="dash-calls__colhead--status">Status</span>
      </div>

      <div className="dash-calls__rows">
        {list.length === 0 && (
          <div className="dash-calls__empty">No upcoming calls</div>
        )}
        {list.map((c) => {
          const graphName = getDatasetConfigForId(c.id).graphName;
          const onGraph = !!(locateCall && locateCall(c.id));
          const days = daysUntil(c.closeDate);
          const closing = days != null && days >= 0 && days <= 10;
          return (
            <div className="dash-calls__row" key={c.id}>
              <div className="dash-calls__call">
                <span
                  className="dash-calls__dot"
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

              <div className="dash-calls__budget">{formatBudget(c.budget)}</div>

              <div className="dash-calls__deadline">
                <div className="dash-calls__deadline-rel">
                  {relDeadline(days, c.closeDate)}
                </div>
                <div className="dash-calls__prog">{c.programmeLabel}</div>
              </div>

              <div className="dash-calls__status">
                <span
                  className={`dash-calls__pill ${closing ? "is-closing" : "is-open"}`}
                >
                  <span className="dash-calls__pill-dot" />
                  {closing ? "Closing" : "Open"}
                </span>
                {onGraph && (
                  <button
                    type="button"
                    className="dash-calls__action"
                    onClick={() => {
                      if (onLocateCall && onLocateCall(c.id)) setViewMode("graph");
                    }}
                  >
                    Show in graph
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
