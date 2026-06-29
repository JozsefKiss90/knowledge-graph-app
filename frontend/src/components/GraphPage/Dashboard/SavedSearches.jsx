import React from "react";

const FILTERS = [
  { key: "open", label: "All open calls" },
  { key: "closing30", label: "Calls closing in 30 days" },
];

export default function SavedSearches({ openCalls, closingIn30d, activeFilter, onSelectFilter }) {
  const countFor = (key) => (key === "open" ? openCalls : key === "closing30" ? closingIn30d : null);
  return (
    <div className="dash-card dash-searches">
      <div className="dash-card__header">
        <h3 className="dash-card__title">Quick filters</h3>
        <span className="dash-card__subtitle">Filter the calls table</span>
      </div>
      <ul className="dash-searches__list">
        {FILTERS.map((f) => {
          const active = activeFilter === f.key;
          const count = countFor(f.key);
          return (
            <li key={f.key} className="dash-searches__item">
              <button
                type="button"
                className={`dash-searches__btn${active ? " dash-searches__btn--active" : ""}`}
                aria-pressed={active}
                onClick={() => onSelectFilter(active ? null : f.key)}
              >
                <span className="dash-searches__label">{f.label}</span>
                {count != null && <span className="dash-searches__badge">{count}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
