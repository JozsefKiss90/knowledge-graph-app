import React from "react";
import KpiCard from "./KpiCard";

export default function KpiCardsRow({
  totalCommitted,
  openCalls,
  closingIn30d,
  topicsTracked,
}) {
  return (
    <div className="dash-kpi-row">
      <KpiCard
        title="Total committed"
        value={totalCommitted}
        unit="currency"
        subtitle="across all programmes"
      />
      <KpiCard
        title="Open calls"
        value={openCalls}
        subtitle="currently accepting"
      />
      <KpiCard
        title="Closing in 30d"
        value={closingIn30d}
        subtitle="upcoming deadlines"
      />
      <KpiCard
        title="Topics tracked"
        value={topicsTracked}
        subtitle="across all calls"
      />
    </div>
  );
}
