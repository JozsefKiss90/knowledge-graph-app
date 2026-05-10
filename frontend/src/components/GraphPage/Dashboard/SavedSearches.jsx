import React from "react";

const MOCK_SEARCHES = [
  { label: "All open calls", count: null },
  { label: "Calls closing in 30 days", count: null },
  { label: "High-budget programmes", count: null },
];

export default function SavedSearches({ closingIn30d, openCalls }) {
  // Populate counts from real data where possible
  const searches = MOCK_SEARCHES.map((s) => {
    if (s.label.includes("open calls")) return { ...s, count: openCalls };
    if (s.label.includes("30 days")) return { ...s, count: closingIn30d };
    return s;
  });

  return (
    <div className="dash-card dash-searches">
      <div className="dash-card__header">
        <h3 className="dash-card__title">Saved searches</h3>
        <span className="dash-card__subtitle">Run on the live graph</span>
      </div>
      <ul className="dash-searches__list">
        {searches.map((s, i) => (
          <li key={i} className="dash-searches__item">
            <span className="dash-searches__label">{s.label}</span>
            {s.count != null && (
              <span className="dash-searches__badge">{s.count}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
