import React from "react";
import { Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import { formatValue, formatUnit } from "./KpiCard";

// €-scaled figure (B/M/K) reusing the KpiCard formatters so the strip matches the tiles exactly.
function euro(value) {
  const v = Number(value) || 0;
  return `€${formatValue(v, "currency")}${formatUnit(v).replace("€", "")}`;
}
function count(value) {
  return (Number(value) || 0).toLocaleString();
}

/**
 * ON OFFER / FUNDED summary band — the mockup's footer strip.
 *
 * Left group (ON OFFER) is the work-programme side, always shown. Right group (FUNDED) is the CORDIS
 * funded-reality side and only appears once real funded-project data is ingested; until then we show
 * an honest "appears once ingested" note rather than a row of zeros. Planned and awarded stay two
 * separate measures (never blended), honouring the honesty contract. The two halves are labelled so
 * the reader always knows which source a figure comes from.
 */
export default function OfferFundedStrip({
  totalCommitted,
  programmeCount,
  openCalls,
  cordis,
  cordisActive,
}) {
  const offer = [
    { v: euro(totalCommitted), l: "ON OFFER" },
    { v: count(programmeCount), l: "PROGRAMMES" },
    { v: count(openCalls), l: "OPEN CALLS" },
  ];

  const funded =
    cordisActive && cordis
      ? [
          { v: count(cordis.projectCount), l: "PROJECTS" },
          { v: euro(cordis.totalEcContribution), l: "EU AWARDED" },
          { v: count(cordis.organisationCount), l: "ORGANISATIONS" },
          { v: count(cordis.countryCount), l: "COUNTRIES" },
        ]
      : null;

  return (
    <div className="dash-offerstrip">
      <span className="dash-offerstrip__badge dash-offerstrip__badge--offer">ON OFFER</span>
      {offer.map((s) => (
        <div className="dash-offerstrip__stat" key={s.l}>
          <span className="dash-offerstrip__value">{s.v}</span>
          <span className="dash-offerstrip__label">{s.l}</span>
        </div>
      ))}

      <span className="dash-offerstrip__divider" />

      {funded ? (
        <>
          <span className="dash-offerstrip__badge dash-offerstrip__badge--funded">FUNDED</span>
          {funded.map((s) => (
            <div className="dash-offerstrip__stat" key={s.l}>
              <span className="dash-offerstrip__value">{s.v}</span>
              <span className="dash-offerstrip__label">{s.l}</span>
            </div>
          ))}
        </>
      ) : (
        <span className="dash-offerstrip__pending">
          Funded track record (CORDIS) appears here once ingested
        </span>
      )}

      <span className="dash-offerstrip__grow" />

      <Tooltip
        arrow
        placement="top"
        title={
          cordisActive && cordis
            ? cordis.provenance
            : "Real awarded euros and organisations appear once EU funded-project data (CORDIS) is ingested."
        }
      >
        <span className="dash-offerstrip__note">
          On offer = work programme · Funded = CORDIS
          <InfoOutlinedIcon fontSize="inherit" className="dash-offerstrip__note-icon" />
        </span>
      </Tooltip>
    </div>
  );
}
