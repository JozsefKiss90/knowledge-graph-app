import React from "react";

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

export default function OpenCallsTable({ upcomingCalls, setViewMode }) {
  return (
    <div className="dash-card dash-table-card">
      <div className="dash-card__header">
        <div>
          <h3 className="dash-card__title">Open calls closing soon</h3>
          <span className="dash-card__subtitle">
            Sorted by deadline
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
            </tr>
          </thead>
          <tbody>
            {upcomingCalls.length === 0 && (
              <tr>
                <td colSpan={5} className="dash-table__empty">
                  No upcoming calls
                </td>
              </tr>
            )}
            {upcomingCalls.map((c) => (
              <tr key={c.id}>
                <td>
                  <span
                    className="dash-table__dot"
                    style={{ backgroundColor: c.programmeColor }}
                  />
                  <span className="dash-table__call-id">{c.id}</span>
                </td>
                <td>{c.programmeLabel}</td>
                <td>{c.stage || "—"}</td>
                <td>{formatBudget(c.budget)}</td>
                <td>{formatDate(c.closeDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
