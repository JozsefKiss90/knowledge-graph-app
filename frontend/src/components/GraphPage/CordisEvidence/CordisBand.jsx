import React, { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import CordisEvidencePanel from "./CordisEvidencePanel";
import CordisPartnersPanel from "./CordisPartnersPanel";
import MoneyBadge from "../../common/MoneyBadge";

// Launch surface only (UX-DECISIONS Q2.3 / Q6.5): A2 funded projects + B2 organisations.
// A6 trend and B3 related calls are second-wave — deliberately not tabs here yet.
const TABS = [
  { key: "projects", label: "Funded projects" },
  { key: "orgs", label: "Organisations" },
];

// Same € formatter as the sibling CORDIS panels — counts and euros are never mixed.
function formatBudget(val) {
  if (val >= 1e9) return `€${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `€${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `€${(val / 1e3).toFixed(0)}K`;
  if (val > 0) return `€${val.toLocaleString()}`;
  return "—";
}

/**
 * The evidence band (the flip, ADR-0001): always present on a call, titled with the
 * sanctioned thematic wording, collapsed to a one-line summary that expands on demand.
 * Pre-ingest it stays visible with an honest empty line (ADR-0006 #2) — never blank,
 * never removed. "CORDIS" is user-facing only as attribution (Q5.3).
 */
export default function CordisBand({ callId, evidence }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("projects");
  if (!callId) return null;

  const ev = evidence?.data;
  const loading = !!evidence?.loading;
  const error = evidence?.error;
  const count = ev?.projectCount || 0;
  const hasEvidence = count > 0;

  let summary;
  if (loading) {
    summary = "Checking the funded track record…";
  } else if (hasEvidence) {
    const parts = [
      `${count.toLocaleString()} funded project${count === 1 ? "" : "s"}`,
      `${formatBudget(ev.totalEcContribution)} awarded`,
    ];
    const topCountry = ev.topCountries?.[0]?.country;
    if (topCountry) parts.push(`top country ${topCountry}`);
    summary = parts.join(" · ");
  } else if (error) {
    // Distinct from the pre-ingest line: a fetch failure says nothing about ingest state.
    summary = "The funded track record couldn’t be loaded right now.";
  } else {
    summary = "No CORDIS data ingested for this area yet.";
  }

  // Expanding is only offered when there is evidence behind it — a toggle that reveals
  // nothing would be an inert control (ADR-0006 #2).
  const expandable = hasEvidence;
  const expanded = expandable && open;
  const toggle = () => setOpen((o) => !o);

  const bodyId = `cordis-band-body-${callId}`;
  const tabId = (key) => `cordis-band-tab-${key}-${callId}`;
  const panelId = `cordis-band-panel-${callId}`;

  // Arrow keys move between tabs, as the tablist role promises. Declaring the role without the
  // keyboard contract is worse than not declaring it.
  const onTabKeyDown = (e) => {
    const i = TABS.findIndex((t) => t.key === tab);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setTab(TABS[(i + 1) % TABS.length].key);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setTab(TABS[(i - 1 + TABS.length) % TABS.length].key);
    }
  };

  return (
    <Box className="nd-card nd-cordis-band" component="section" aria-labelledby={`${bodyId}-title`}>
      <Box
        className={`nd-card-header nd-cordis-band__head${
          expandable ? " nd-cordis-band__head--expandable" : ""
        }`}
        onClick={expandable ? toggle : undefined}
      >
        <Box className="nd-cordis-band__head-main">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography
              variant="body2"
              component="h2"
              id={`${bodyId}-title`}
              className="nd-card-title nd-muted-label"
            >
              Funded track record in this area
            </Typography>
            {/* Only stamp the awarded badge when there is a real € in the summary — pre-ingest the
                line is an honest empty state with no figure to label (ADR-0006 #2/#5). */}
            {hasEvidence && <MoneyBadge kind="awarded" />}
          </Box>
          <div
            className={`nd-cordis-band__summary${
              hasEvidence ? "" : " nd-cordis-band__summary--muted"
            }`}
          >
            {summary}
          </div>
          {/* The scope qualifier used to live inside the collapsed body, so the default state of
              the page was the unqualified claim and the correction was opt-in. ADR-0001 requires
              the "in this area" reading to travel with the figure, so it sits with the summary. */}
          {hasEvidence && (
            <div className="nd-cordis-band__scope">
              In this call’s research area — not funded by this call.
            </div>
          )}
        </Box>
        {expandable && (
          <Button
            size="small"
            variant="text"
            className="nd-card-toggle"
            aria-expanded={expanded}
            aria-controls={bodyId}
            aria-label={`${expanded ? "Hide" : "Show"} the funded track record in this area`}
            onClick={(e) => {
              // The header is also a click target; without this the toggle would fire twice.
              e.stopPropagation();
              toggle();
            }}
          >
            {expanded ? "Hide" : "Show"}
          </Button>
        )}
      </Box>
      {expanded && (
        <Box className="nd-card-body" id={bodyId}>
          <div className="nd-cordis-band__caveat">
            These figures describe EU-funded activity in this call’s research area — not this call’s own
            budget, scope, or a measure of quality. Organisations funded nationally or privately won’t appear.
          </div>
          <div className="nd-cordis-band__tabs" role="tablist" aria-label="Funded track record">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                id={tabId(key)}
                type="button"
                role="tab"
                aria-selected={tab === key}
                aria-controls={panelId}
                tabIndex={tab === key ? 0 : -1}
                className={`nd-cordis-band__tab${tab === key ? " nd-cordis-band__tab--active" : ""}`}
                onClick={() => setTab(key)}
                onKeyDown={onTabKeyDown}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="nd-cordis-band__body"
            id={panelId}
            role="tabpanel"
            tabIndex={0}
            aria-labelledby={tabId(tab)}
          >
            {tab === "projects" && <CordisEvidencePanel callId={callId} bare evidence={evidence} />}
            {tab === "orgs" && <CordisPartnersPanel callId={callId} bare />}
          </div>
          <div className="nd-cordis-band__prov">
            Source: EU CORDIS (FP7–Horizon Europe) — funded projects matching this call’s subject area
            {ev.subject ? ` — “${ev.subject}”` : ""}
          </div>
        </Box>
      )}
    </Box>
  );
}
