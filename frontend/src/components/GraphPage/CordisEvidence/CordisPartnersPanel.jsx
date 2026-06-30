import React, { useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import useCordisOrganisations from "./useCordisOrganisations";
import CordisEmptyState from "./CordisEmptyState";
import OrgLink from "./OrgLink";

/**
 * B2 — "Who works in this area" / partner finder: the organisations most active in a call's CORDIS-funded
 * research area, showing how often each one coordinates (leads) vs. partners (joins) projects, filterable
 * by country and organisation type. Honest framing: this is EU-funded participation, NOT scientific quality
 * or impact ("most active" is not "best"); organisations funded nationally/privately won't appear. Hidden
 * when the area has no CORDIS participation (same gate as A2/A6/B3).
 */
function Card({ children }) {
  return (
    <Box className="nd-card cordis-partners">
      <Box className="nd-card-header">
        <Typography variant="body2" className="nd-card-title nd-muted-label">
          Who works in this area (CORDIS)
        </Typography>
      </Box>
      <Box className="nd-card-body">{children}</Box>
    </Box>
  );
}

export default function CordisPartnersPanel({ callId, bare = false }) {
  const [country, setCountry] = useState("");
  const [orgType, setOrgType] = useState("");
  const { loading, data } = useCordisOrganisations(callId, { country, orgType });

  // Keep the last non-null response so changing a filter doesn't unmount the whole card mid-fetch (the
  // filter controls would otherwise lose focus / flicker). The unfiltered org count lives on every
  // response, so the card's overall hide-when-empty gate survives across filter changes.
  const lastRef = useRef(null);
  if (data) lastRef.current = data;
  const view = data || lastRef.current;

  if (!callId) return null;
  if (!view && loading) return null;

  // In the consolidated band (bare), the Organisations sub-tab must never render blank — e.g. on a
  // fetch error, or a truly-empty area — so it stays consistent with the sibling bare panels. Standalone,
  // keep hiding the card entirely (return null).
  const emptyState = bare ? (
    <div className="cordis-partners">
      <CordisEmptyState
        compact
        message="Organisation activity for this research area will appear here once it's available."
      />
    </div>
  ) : null;

  if (!view) return emptyState;
  // Truly empty area (no CORDIS participation at all) → hide the card entirely, like the sibling panels.
  if ((view.organisationCount || 0) === 0) return emptyState;

  const orgs = view.organisations || [];
  const countryFacets = view.facets?.countries || [];
  // A blank activity-type code maps to "Unknown" and can't be filtered server-side (empty == no filter),
  // so it's shown in row labels but omitted from the dropdown to avoid a non-functional option.
  const typeFacets = (view.facets?.orgTypes || []).filter((t) => t.code);
  const topTotal = Math.max(...orgs.map((o) => o.projectCount || 0), 1);

  const body = (
    <>
      {!bare && (
        <div className="cordis-partners__hint">
          Organisations funded to work on this research area, and how often they lead (coordinate) vs. join
          (partner) projects. EU-funded participation only — not a measure of quality or impact, and
          organisations funded nationally or privately won&rsquo;t appear.
        </div>
      )}

      <div className="cordis-partners__filters">
        <label className="cordis-partners__filter">
          <span className="cordis-partners__filter-label">Country</span>
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">All countries</option>
            {countryFacets.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.orgs})
              </option>
            ))}
          </select>
        </label>
        <label className="cordis-partners__filter">
          <span className="cordis-partners__filter-label">Organisation type</span>
          <select value={orgType} onChange={(e) => setOrgType(e.target.value)}>
            <option value="">All types</option>
            {typeFacets.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label} ({t.orgs})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="cordis-partners__legend">
        <span><i className="cordis-partners__swatch cordis-partners__swatch--coord" /> Coordinates (leads)</span>
        <span><i className="cordis-partners__swatch cordis-partners__swatch--partner" /> Partners (joins)</span>
      </div>

      {orgs.length === 0 ? (
        <div className="cordis-partners__empty">
          No organisations match these filters.{" "}
          <button
            type="button"
            className="cordis-partners__reset"
            onClick={() => { setCountry(""); setOrgType(""); }}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <ul className="cordis-partners__list">
          {orgs.map((o) => {
            const coordPct = (o.coordinatedCount / topTotal) * 100;
            const partnerPct = (o.partneredCount / topTotal) * 100;
            return (
              <li key={o.id} className="cordis-partners__row">
                <div className="cordis-partners__main">
                  <OrgLink id={o.id} name={o.name} className="cordis-partners__name" />
                  <div className="cordis-partners__meta">
                    {o.country ? <span>{o.country}</span> : null}
                    {o.country ? <span aria-hidden> · </span> : null}
                    <span>{o.orgTypeLabel}</span>
                  </div>
                  <div
                    className="cordis-partners__bar-track"
                    title={`${o.coordinatedCount} coordinated · ${o.partneredCount} partnered`}
                  >
                    <span
                      className="cordis-partners__bar-seg cordis-partners__bar-seg--coord"
                      style={{ width: `${coordPct}%` }}
                    />
                    <span
                      className="cordis-partners__bar-seg cordis-partners__bar-seg--partner"
                      style={{ width: `${partnerPct}%` }}
                    />
                  </div>
                </div>
                <div className="cordis-partners__counts">
                  <span className="cordis-partners__count-total">{o.projectCount} projects</span>
                  <span className="cordis-partners__count-split">
                    {o.coordinatedCount} led · {o.partneredCount} joined
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {view.capped && (
        <div className="cordis-partners__capnote">
          Showing top {view.returnedCount} of {view.filteredCount} organisations — refine with the filters.
        </div>
      )}

      {!bare && (
        <div className="cordis-partners__prov">
          {view.provenance}
          {view.subject ? ` — “${view.subject}”` : ""}
        </div>
      )}
    </>
  );

  return bare ? <div className="cordis-partners">{body}</div> : <Card>{body}</Card>;
}
