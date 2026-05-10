import React, { useState } from "react";

function formatBudget(val) {
  if (val >= 1e9) return `€${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `€${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `€${(val / 1e3).toFixed(0)}K`;
  if (val > 0) return `€${val.toLocaleString()}`;
  return "—";
}

export default function FundingByProgramme({ callsByProgramme }) {
  const [tab, setTab] = useState("committed");
  const maxBudget = Math.max(...callsByProgramme.map((p) => p.budget), 1);

  return (
    <div className="dash-card dash-funding">
      <div className="dash-card__header">
        <h3 className="dash-card__title">Funding by programme</h3>
        <div className="dash-card__tabs">
          {["committed", "spot", "forecast"].map((t) => (
            <button
              key={t}
              type="button"
              className={`dash-card__tab${tab === t ? " dash-card__tab--active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="dash-funding__bars">
        {callsByProgramme.map((p) => (
          <div key={p.key} className="dash-funding__row">
            <span className="dash-funding__label">{p.label}</span>
            <div className="dash-funding__bar-track">
              <div
                className="dash-funding__bar-fill"
                style={{
                  width: `${Math.max((p.budget / maxBudget) * 100, 2)}%`,
                  backgroundColor: p.color,
                }}
              />
            </div>
            <span className="dash-funding__value">{formatBudget(p.budget)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
