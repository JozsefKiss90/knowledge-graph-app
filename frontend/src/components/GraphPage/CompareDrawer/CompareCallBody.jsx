import React from "react";
import { Box, Typography } from "@mui/material";
import CompareNodeHeader from "./CompareNodeHeader";
import CompareMetricRow from "./CompareMetricRow";

// Same € formatter grammar as the CORDIS panels — counts and euros are never mixed.
function formatBudget(value) {
  if (!value || !Number.isFinite(value) || value === 0) return "—";
  if (value >= 1e9) return `€${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `€${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `€${(value / 1e3).toFixed(0)}K`;
  return `€${value.toLocaleString()}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDeadline(date) {
  if (!date) return "—";
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// Type of action arrives in assorted long forms; show the recognised acronym when we can.
function shortType(t) {
  if (!t) return "—";
  const s = String(t);
  const m = s.match(/\b(RIA|IA|CSA|COFUND|SGA|PCP|PPI)\b/i);
  if (m) return m[1].toUpperCase();
  if (/research and innovation/i.test(s)) return "RIA";
  if (/innovation action/i.test(s)) return "IA";
  if (/coordination and support/i.test(s)) return "CSA";
  return s.length > 16 ? `${s.slice(0, 14)}…` : s;
}

// Per-column value for an A2 evidence figure. Honest per ADR-0006: a loading slot says so, a fetch
// error is "n/a" (not a false "no data"), a call with no ingested evidence reads "None yet" — never
// a fabricated number. Counts and euros stay in their own rows (counts ≠ funding).
function projectsCell(evidence) {
  if (!evidence) return "—";
  if (evidence.loading) return "…";
  if (evidence.error) return "n/a";
  const count = evidence.data?.projectCount || 0;
  return count ? count.toLocaleString() : "None yet";
}
function awardedCell(evidence) {
  if (!evidence) return "—";
  if (evidence.loading) return "…";
  if (evidence.error) return "n/a";
  const count = evidence.data?.projectCount || 0;
  return count ? formatBudget(evidence.data?.totalEcContribution) : "—";
}

/**
 * Call-level compare body (phase-plan Step 6 / UX-DECISIONS Q4.3): the deliberation payoff — two
 * shortlisted calls side by side with their advertised deadline/budget and their A2 funded-track-
 * record evidence. Presentational only; the parent (useCallCompareData) owns the fetches, mirroring
 * CordisBand's evidence-as-prop seam so this stays unit-testable without a network mock.
 */
export default function CompareCallBody({ callA, callB, onClearNode }) {
  const mA = callA?.metrics;
  const mB = callB?.metrics;
  const evA = callA?.evidence;
  const evB = callB?.evidence;

  return (
    <>
      {/* Two-column call headers — the status rides as the header subtitle (not "2021-27"). */}
      <Box className="compare-drawer__columns">
        <CompareNodeHeader
          node={callA?.node}
          onClear={() => onClearNode?.(0)}
          subtitle={mA?.status || ""}
        />
        <CompareNodeHeader
          node={callB?.node}
          onClear={() => onClearNode?.(1)}
          subtitle={mB?.status || ""}
        />
      </Box>

      {/* Advertised facts — the "should I even look" read. Budget carries its on-offer half-badge. */}
      <Box className="compare-drawer__metrics">
        <CompareMetricRow label="STATUS" valueA={mA?.status || "—"} valueB={mB?.status || "—"} />
        <CompareMetricRow
          label="DEADLINE"
          valueA={formatDeadline(mA?.deadline)}
          valueB={formatDeadline(mB?.deadline)}
        />
        <CompareMetricRow
          label="BUDGET"
          badge="advertised"
          valueA={formatBudget(mA?.budget)}
          valueB={formatBudget(mB?.budget)}
        />
        <CompareMetricRow
          label="TYPE"
          valueA={shortType(mA?.typeOfAction)}
          valueB={shortType(mB?.typeOfAction)}
        />
      </Box>

      {/* A2 evidence — the "worth it" half. ADR-0001 thematic wording ("in this area", never "behind
          this call"); the awarded € carries its half-badge; counts stay a separate row. */}
      <Box className="compare-drawer__evidence">
        <Typography className="compare-drawer__section-label">
          Funded track record in this area
        </Typography>
        <Box className="compare-drawer__metrics">
          <CompareMetricRow
            label="FUNDED PROJECTS"
            valueA={projectsCell(evA)}
            valueB={projectsCell(evB)}
          />
          <CompareMetricRow
            label="AWARDED"
            badge="awarded"
            valueA={awardedCell(evA)}
            valueB={awardedCell(evB)}
          />
        </Box>
        <div className="compare-drawer__prov">
          Source: EU CORDIS (FP7–Horizon Europe) — funded projects matching each call’s subject area,
          not the calls’ own budgets.
        </div>
      </Box>
    </>
  );
}
