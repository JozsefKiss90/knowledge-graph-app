import React from "react";
import { Link } from "react-router-dom";
import { getDatasetConfigForId } from "../../NodeDetalParts/useNodeDetail";

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

export default function OpenCallsTable({ rows, setViewMode, onLocateCall, locateCall, filterLabel }) {
  return (
    <div className="dash-card dash-table-card">
      <div className="dash-card__header">
        <div>
          <h3 className="dash-card__title">Open calls closing soon</h3>
          <span className="dash-card__subtitle">
            {filterLabel || "Sorted by deadline"}
          </span>
        </div>
        {setViewMode && (
          <button
            type="button"
            className="dash-table__graph-link"
            onClick={() => setViewMode("graph")}
          >
            View on graph
          </button>
        )}
      </div>
      <div className="dash-table__wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Call ID</th>
              <th>Programme</th>
              <th>Stage</th>
              <th>Budget</th>
              <th>Deadline</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="dash-table__empty">
                  No upcoming calls
                </td>
              </tr>
            )}
            {rows.map((c) => {
              const graphName = getDatasetConfigForId(c.id).graphName;
              const onGraph = !!(locateCall && locateCall(c.id));
              return (
                <tr key={c.id}>
                  <td>
                    <span className="dash-table__dot" style={{ backgroundColor: c.programmeColor }} />
                    <Link
                      to={`/node/${encodeURIComponent(c.id)}`}
                      state={{ graphName, returnGraphName: graphName }}
                      onClick={() => localStorage.setItem("graphName", graphName)}
                      className="dash-table__call-id dash-table__call-id-link"
                      title={c.label}
                    >
                      {c.id}
                    </Link>
                  </td>
                  <td>{c.programmeLabel}</td>
                  <td>{c.stage || "—"}</td>
                  <td>{formatBudget(c.budget)}</td>
                  <td>{formatDate(c.closeDate)}</td>
                  <td className="dash-table__action">
                    {onGraph && (
                      <button
                        type="button"
                        className="dash-table__row-link"
                        onClick={() => { if (onLocateCall && onLocateCall(c.id)) setViewMode("graph"); }}
                      >
                        Show in graph
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
