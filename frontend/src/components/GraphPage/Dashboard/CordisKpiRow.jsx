import React from "react";
import KpiCard from "./KpiCard";

// F1: the funded-reality KPI band — portfolio-wide CORDIS totals, the awarded counterpart to the
// planned KpiCardsRow. Counts (projects/orgs/countries/fields) and euros are shown as separate cards,
// never blended. Rendered only when CORDIS data exists (gated by the parent on projectCount > 0).
export default function CordisKpiRow({ data }) {
  if (!data) return null;

  return (
    <div className="dash-kpi-row dash-kpi-row--cordis">
      <KpiCard
        title="Funded projects"
        value={data.projectCount}
        subtitle="linked to tracked calls"
      />
      <KpiCard
        title="EU € awarded"
        value={data.totalEcContribution}
        unit="currency"
        subtitle="EU contribution (historical)"
        badge="funded"
        badgeVariant="filled"
      />
      <KpiCard
        title="Organisations"
        value={data.organisationCount}
        subtitle="funded participants"
      />
      <KpiCard
        title="Countries"
        value={data.countryCount}
        subtitle="with funded organisations"
      />
      <KpiCard
        title="Research fields"
        value={data.fieldCount}
        subtitle="EuroSciVoc classifications"
      />
    </div>
  );
}
