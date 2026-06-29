import React from "react";

const TOP_N = 8;

// A neutral sequential palette for the ranked domains — index-based, carrying no semantic meaning (the
// EuroSciVoc domains aren't an ordered scale), just enough hue separation to tell the bars apart.
const DOMAIN_COLORS = [
  "#60A5FA", "#34D399", "#A78BFA", "#FBBF24",
  "#F472B6", "#22D3EE", "#FB923C", "#A3E635",
];

const fmt = (n) => (n || 0).toLocaleString();

/**
 * F4 — Funded-field portfolio mix: a subject-first read of where the funded research sits. The top-level
 * EuroSciVoc domains (depth-1 field-tree roots) across all CORDIS-funded projects, as ranked bars by share
 * of funded projects. Reuses the B5 /field-tree endpoint (zero backend cost). Honest framing: a project
 * carries SEVERAL EuroSciVoc classifications, so domain shares OVERLAP and don't add up to 100% — these are
 * EU-funded participation counts, not scientific quality. Read-only (the B5 drawer is the drill-down path).
 * Rendered only when CORDIS field data exists (gated by the parent on the F1 summary).
 */
export default function CordisFieldMix({ data, loading, onShowFields }) {
  if (loading) return null;
  const total = data?.totalProjects || 0;
  // Top-level domains only (depth-1 roots). No classified projects → nothing to show (the F1 gate already
  // hides the whole section when there's no CORDIS data; this also covers "ingested but unclassified").
  const roots = (data?.tree || []).filter((n) => n.depth === 1);
  if (!roots.length || total === 0) return null;

  const sorted = [...roots].sort((a, b) => (b.projectCount || 0) - (a.projectCount || 0));
  const top = sorted.slice(0, TOP_N);
  const othersCount = sorted.length - top.length;

  return (
    <div className="dash-card dash-field-mix">
      <div className="dash-card__header">
        <div>
          <h3 className="dash-card__title">Funded research domains (CORDIS)</h3>
          <span className="dash-card__subtitle">
            {fmt(total)} funded projects · top EuroSciVoc domains
          </span>
        </div>
      </div>

      <div className="dash-funding__bars dash-field-mix__bars">
        {top.map((n, i) => {
          const share = total > 0 ? (n.projectCount || 0) / total : 0;
          const label = n.synthetic ? `field group ${n.code}` : (n.title || n.code);
          return (
            <button
              key={n.code}
              type="button"
              className="dash-funding__row dash-field-mix__row"
              onClick={() => onShowFields?.()}
            >
              <span className="dash-funding__label" title={label}>{label}</span>
              <div className="dash-funding__bar-track">
                <div
                  className="dash-funding__bar-fill"
                  style={{
                    width: `${Math.max(share * 100, 2)}%`,
                    backgroundColor: DOMAIN_COLORS[i % DOMAIN_COLORS.length],
                  }}
                />
              </div>
              <span
                className="dash-funding__value"
                title={`${fmt(n.projectCount)} of ${fmt(total)} funded projects classified in this domain`}
              >
                {Math.round(share * 100)}% · {fmt(n.projectCount)} proj
              </span>
            </button>
          );
        })}
        {othersCount > 0 && (
          <div className="dash-field-mix__others">
            +{fmt(othersCount)} smaller research {othersCount === 1 ? "domain" : "domains"}
          </div>
        )}
      </div>

      <p className="dash-funding__note">
        Share of funded projects per top-level research domain. A project carries several EuroSciVoc
        classifications, so domain shares overlap and don't add up to 100%. EU-funded participation, not
        scientific quality.
      </p>
    </div>
  );
}
