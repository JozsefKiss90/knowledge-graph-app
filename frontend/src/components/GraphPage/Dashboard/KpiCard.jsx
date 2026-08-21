import React from "react";

// Shared KPI value/unit formatters. Exported so other dashboard surfaces (OfferFundedStrip) reuse
// the exact same number formatting as the original KpiCard (currency scaled to B/M/K, counts
// via toLocaleString) instead of re-deriving numbers in JSX.
export function formatValue(value, unit) {
  if (unit === "currency") {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}`;
    return String(value);
  }
  return value.toLocaleString();
}

export function formatUnit(value) {
  if (value >= 1e9) return "€B";
  if (value >= 1e6) return "€M";
  if (value >= 1e3) return "€K";
  return "€";
}

export default function KpiCard({ title, value, unit, subtitle, badge, badgeVariant = "outline" }) {
  const isCurrency = unit === "currency";

  return (
    <div className="dash-kpi-card">
      <div
        className="dash-kpi-card__title-row"
        style={{ display: "flex", alignItems: "center", gap: 6 }}
      >
        <span className="dash-kpi-card__title">{title}</span>
        {badge && (
          <span
            className={`dash-kpi-card__badge dash-kpi-card__badge--${badgeVariant}`}
            style={
              badgeVariant === "filled"
                ? {
                    fontSize: "0.58rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "1px 6px",
                    borderRadius: 999,
                    lineHeight: 1.4,
                    background: "var(--primary, #47a9ff)",
                    color: "#fff",
                  }
                : {
                    fontSize: "0.58rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "1px 6px",
                    borderRadius: 999,
                    lineHeight: 1.4,
                    border: "1px solid var(--border, rgba(255,255,255,0.2))",
                    color: "var(--muted-foreground, #94a3b8)",
                  }
            }
          >
            {badge}
          </span>
        )}
      </div>
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
