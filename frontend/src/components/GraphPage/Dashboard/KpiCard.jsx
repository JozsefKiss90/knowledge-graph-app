import React from "react";

function formatValue(value, unit) {
  if (unit === "currency") {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}`;
    return String(value);
  }
  return value.toLocaleString();
}

function formatUnit(value) {
  if (value >= 1e9) return "€B";
  if (value >= 1e6) return "€M";
  if (value >= 1e3) return "€K";
  return "€";
}

export default function KpiCard({ title, value, unit, subtitle }) {
  const isCurrency = unit === "currency";

  return (
    <div className="dash-kpi-card">
      <span className="dash-kpi-card__title">{title}</span>
      <div className="dash-kpi-card__value-row">
        <span className="dash-kpi-card__value">
          {formatValue(value, unit)}
        </span>
        {isCurrency && (
          <span className="dash-kpi-card__unit">
            {formatUnit(value)}
          </span>
        )}
      </div>
      {subtitle && (
        <span className="dash-kpi-card__subtitle">{subtitle}</span>
      )}
    </div>
  );
}
