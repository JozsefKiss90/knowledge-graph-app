import React from "react";
import { Box, Typography } from "@mui/material";
import useCordisEvidence from "./useCordisEvidence";
import CordisEmptyState from "./CordisEmptyState";

// Same € formatter as the dashboard (FundingByProgramme.jsx) — counts and euros are never mixed.
function formatBudget(val) {
  if (val >= 1e9) return `€${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `€${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `€${(val / 1e3).toFixed(0)}K`;
  if (val > 0) return `€${val.toLocaleString()}`;
  return "—";
}

const FP_LABEL = { HORIZON: "Horizon Europe", H2020: "Horizon 2020", FP7: "FP7" };

function Card({ children }) {
  return (
    <Box className="nd-card cordis-ev">
      <Box className="nd-card-header">
        <Typography variant="body2" className="nd-card-title nd-muted-label">
          Funded projects on this subject (CORDIS)
        </Typography>
      </Box>
      <Box className="nd-card-body">{children}</Box>
    </Box>
  );
}

/**
 * A2 — the real CORDIS funded-project landscape behind a call's SUBJECT area.
 * Honest framing: this is funded activity on the research area, NOT the call's official budget/scope.
 * Renders an empty state where CORDIS has no data; never fabricates figures.
 */
export default function CordisEvidencePanel({ callId }) {
  const { loading, data } = useCordisEvidence(callId);

  // Render only when there's real CORDIS evidence — no empty/loading cards on every call.
  if (!callId || loading) return null;
  const count = data?.projectCount || 0;
  if (!data || count === 0) {
    return (
      <Card>
        <CordisEmptyState
          compact
          message="Awarded EU project data (CORDIS) for this research area will appear here once it has been added. We only ever show real funded-project figures — never estimates."
        />
      </Card>
    );
  }

  const fp = (data.frameworkBreakdown || []).filter((f) => f.n > 0);
  const fpMax = Math.max(...fp.map((f) => f.n), 1);

  return (
    <Card>
      <div className="cordis-ev__hint">
        What has been funded in this research area across framework programmes — not this call's budget or scope.
      </div>

      <div className="nd-metrics-grid">
        <div className="nd-metric">
          <div className="nd-metric-label"><span>Funded projects</span></div>
          <div className="nd-metric-value">{count.toLocaleString()}</div>
        </div>
        <div className="nd-metric">
          <div className="nd-metric-label"><span>Total EU contribution</span></div>
          <div className="nd-metric-value">{formatBudget(data.totalEcContribution)}</div>
        </div>
      </div>

      {fp.length > 0 && (
        <>
          <div className="cordis-ev__section-label">Across framework programmes</div>
          <div className="dash-funding__bars">
            {fp.map((f) => (
              <div key={f.fp} className="dash-funding__row">
                <span className="dash-funding__label">{FP_LABEL[f.fp] || f.fp}</span>
                <div className="dash-funding__bar-track">
                  <div
                    className="dash-funding__bar-fill"
                    style={{ width: `${Math.max((f.n / fpMax) * 100, 2)}%` }}
                  />
                </div>
                <span className="dash-funding__value">
                  {f.n.toLocaleString()}
                  <span className="cordis-ev__sub"> · {formatBudget(f.funding)}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {data.topOrganisations?.length > 0 && (
        <>
          <div className="cordis-ev__section-label">Top organisations (by projects)</div>
          <ul className="cordis-ev__list">
            {data.topOrganisations.map((o, i) => (
              <li key={i} className="cordis-ev__list-row">
                <span className="cordis-ev__list-name">
                  {o.name}{o.country ? ` · ${o.country}` : ""}
                </span>
                <span className="cordis-ev__list-count">{o.n} projects</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {data.topCountries?.length > 0 && (
        <>
          <div className="cordis-ev__section-label">Top countries (by organisations)</div>
          <div className="cordis-ev__chips">
            {data.topCountries.map((c, i) => (
              <span key={i} className="cordis-ev__chip">{c.country} · {c.orgs}</span>
            ))}
          </div>
        </>
      )}

      <div className="cordis-ev__prov">
        {data.provenance}
        {data.subject ? ` — “${data.subject}”` : ""}
      </div>
    </Card>
  );
}
