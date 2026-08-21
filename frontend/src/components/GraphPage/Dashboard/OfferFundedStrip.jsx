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
 * Left group (ON OFFER) is the work-programme side, always shown: indicative funding on
 * offer, never money committed or awarded. Right group (FUNDED) is the CORDIS
 * funded-reality side with four distinct honest states — populated, still loading
 * ("checking"), fetch failed ("couldn't be loaded", never a false not-ingested claim),
 * and not-yet-ingested ("appears once ingested") — never a row of zeros. On-offer and
 * awarded stay two separate measures (never blended), honouring the honesty contract.
 * The two halves are labelled so the reader always knows which source a figure comes from.
 */
export default function OfferFundedStrip({
  totalOnOffer,
  programmeCount,
  openCalls,
  cordis,
  cordisActive,
  cordisLoading,
  cordisError,
}) {
  const offer = [
    { v: euro(totalOnOffer), l: "INDICATIVE FUNDING" },
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

  // The non-populated funded half, resolved once so the strip line and the tooltip can never
  // disagree. Precedence: in-flight beats failed beats not-ingested — a fetch error must never
  // masquerade as "nothing ingested yet".
  const fundedFallback = funded
    ? null
    : cordisLoading
    ? {
        line: "Checking the funded track record (CORDIS)…",
        tooltip: "Checking EU funded-project data (CORDIS)…",
      }
    : cordisError
    ? {
        line: "Funded track record (CORDIS) couldn’t be loaded right now",
        tooltip:
          "CORDIS couldn’t be reached — the funded figures are temporarily unavailable, not empty.",
      }
    : {
        line: "Funded track record (CORDIS) appears here once ingested",
        tooltip:
          "Real awarded euros and organisations appear once EU funded-project data (CORDIS) is ingested.",
      };

  const noteTitle = fundedFallback ? fundedFallback.tooltip : cordis.provenance;

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
          {/* The awarded half is a real, sourced figure (ADR-0006 #7) — name the source on-screen,
              not only in the tooltip. The full provenance still rides the info note at the end. */}
          <span className="dash-offerstrip__src">Source: EU CORDIS</span>
        </>
      ) : (
        <span className="dash-offerstrip__pending">{fundedFallback.line}</span>
      )}

      <span className="dash-offerstrip__grow" />

      <Tooltip arrow placement="top" title={noteTitle}>
        <span className="dash-offerstrip__note">
          On offer = indicative work-programme budgets · Funded = historical CORDIS awards
          <InfoOutlinedIcon fontSize="inherit" className="dash-offerstrip__note-icon" />
        </span>
      </Tooltip>
    </div>
  );
}
