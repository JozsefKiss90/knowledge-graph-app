import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import CordisEvidencePanel from "./CordisEvidencePanel";
import CordisTrendPanel from "./CordisTrendPanel";
import CordisRelatedPanel from "./CordisRelatedPanel";
import CordisPartnersPanel from "./CordisPartnersPanel";

const TABS = [
  { key: "projects", label: "Projects" },
  { key: "funding", label: "Funding history" },
  { key: "related", label: "Related calls" },
  { key: "orgs", label: "Organisations" },
];

export default function CordisBand({ callId, evidence }) {
  const [tab, setTab] = useState("projects");
  const ev = evidence?.data;
  // Same gate the four panels used individually: only show when CORDIS has real funded activity.
  if (!callId || evidence?.loading) return null;
  if (!ev || (ev.projectCount || 0) === 0) return null;

  return (
    <Box className="nd-card nd-cordis-band">
      <Box className="nd-card-header">
        <Typography variant="body2" className="nd-card-title nd-muted-label">
          What’s already been funded in this area (CORDIS)
        </Typography>
      </Box>
      <Box className="nd-card-body">
        <div className="nd-cordis-band__caveat">
          These figures describe EU-funded activity in this call’s research area — not this call’s own
          budget, scope, or a measure of quality. Organisations funded nationally or privately won’t appear.
        </div>
        <div className="nd-cordis-band__tabs" role="tablist" aria-label="CORDIS evidence">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`nd-cordis-band__tab${tab === key ? " nd-cordis-band__tab--active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="nd-cordis-band__body">
          {tab === "projects" && <CordisEvidencePanel callId={callId} bare evidence={evidence} />}
          {tab === "funding" && <CordisTrendPanel callId={callId} bare />}
          {tab === "related" && <CordisRelatedPanel callId={callId} bare />}
          {tab === "orgs" && <CordisPartnersPanel callId={callId} bare />}
        </div>
        <div className="nd-cordis-band__prov">
          {ev.provenance}
          {ev.subject ? ` — “${ev.subject}”` : ""}
        </div>
      </Box>
    </Box>
  );
}
