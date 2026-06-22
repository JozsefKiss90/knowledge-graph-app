import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Box, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import useHopOnHosts from "./useHopOnHosts";

const fmt = (n) => (n || 0).toLocaleString();
const MAX_AGE_OPTIONS = [6, 12, 18, 24];

/**
 * B6 — Hop-on host finder: a side drawer (Country-activity pattern, createPortal to body) listing the ongoing
 * Horizon Europe Pillar II / EIC Pathfinder collaborative projects a widening-country partner could join via
 * the Hop-on Facility, and — per host — which widening countries are NOT yet in the consortium (the actual
 * opening). Filterable by research field, cluster/programme, "missing widening country", and minimum
 * remaining run-time. Pure read of existing CordisProject properties.
 *
 * Honest framing: a profile-match SHORTLIST, not an official eligibility ruling (the Work Programme and the
 * project's consent decide); EU-funded participation, not quality. The widening-country list is a disclosed
 * EU reference, intersected with codes actually present.
 */
export default function HopOnHostsDrawer({ open, onClose }) {
  const [filters, setFilters] = useState({ programme: "", field: "", missingCountry: "", maxAgeMonths: 12 });
  const { loading, data } = useHopOnHosts(filters, open);

  if (!open) return null;

  const facets = data?.facets || { programmes: [], fields: [], wideningPresent: [] };
  const hosts = data?.hosts || [];
  // Empty only when a loaded response truly has no eligible hosts AND no facets (i.e. nothing ingested).
  const noData = !loading && data && data.eligibleCount === 0 && (facets.programmes || []).length === 0;

  const setFilter = (key) => (e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }));
  const setNumFilter = (key) => (e) => setFilters((prev) => ({ ...prev, [key]: Number(e.target.value) }));

  const card = (
    <Box className="hop-on-drawer">
      <Box className="hop-on-drawer__header">
        <GroupAddIcon sx={{ fontSize: 20, color: "var(--primary)" }} />
        <Typography sx={{ fontWeight: 700, fontSize: 15, flex: 1 }}>
          Hop-on opportunities (CORDIS)
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: "var(--foreground-muted)", "&:hover": { color: "var(--foreground)" } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <div className="hop-on__hint">
        <strong>Recently started</strong>, ongoing Horizon Europe <strong>Pillar II</strong> and{" "}
        <strong>EIC Pathfinder</strong> collaborative projects whose profile matches the Hop-on
        Facility&rsquo;s host criteria — a widening-country partner may be able to join while the project is
        still early in its life (roughly its first reporting period). Each row shows the widening countries{" "}
        <strong>not yet</strong> in the consortium. This is a <strong>shortlist to investigate</strong>, not
        an official eligibility confirmation — the Work Programme and the project&rsquo;s consent decide.
        EU-funded participation only, not a measure of quality.
      </div>

      {loading && !data ? (
        <div className="hop-on__empty">Loading hop-on opportunities…</div>
      ) : noData ? (
        <div className="hop-on__empty">
          No CORDIS project data has been ingested yet. Run the CORDIS ingest job on the backend to populate
          funded projects, then reopen this panel.
        </div>
      ) : (
        <>
          <div className="hop-on__filters">
            <label className="hop-on__filter">
              <span className="hop-on__filter-label">Programme</span>
              <select value={filters.programme} onChange={setFilter("programme")}>
                <option value="">All programmes</option>
                {(facets.programmes || []).map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label} ({fmt(p.hosts)})
                  </option>
                ))}
              </select>
            </label>

            <label className="hop-on__filter">
              <span className="hop-on__filter-label">Research field</span>
              <select value={filters.field} onChange={setFilter("field")}>
                <option value="">All research fields</option>
                {(facets.fields || []).map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.title} ({fmt(f.hosts)})
                  </option>
                ))}
              </select>
            </label>

            <label className="hop-on__filter">
              <span className="hop-on__filter-label">Not yet a partner (widening country)</span>
              <select value={filters.missingCountry} onChange={setFilter("missingCountry")}>
                <option value="">Any widening country</option>
                {(facets.wideningPresent || []).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} (in {fmt(c.hosts)} other host{c.hosts === 1 ? "" : "s"})
                  </option>
                ))}
              </select>
            </label>

            <label className="hop-on__filter">
              <span className="hop-on__filter-label">Started within (host must be early in its life)</span>
              <select value={filters.maxAgeMonths} onChange={setNumFilter("maxAgeMonths")}>
                {MAX_AGE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    last {m} months
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="hop-on__headline">
            <strong>{fmt(data?.hostCount)}</strong> eligible host project
            {data?.hostCount === 1 ? "" : "s"}
            {data && data.hostCount !== data.eligibleCount
              ? ` (of ${fmt(data.eligibleCount)} early-stage hosts)`
              : ""}
          </div>

          {hosts.length === 0 ? (
            <div className="hop-on__list-empty">
              No ongoing eligible host projects match these filters.
            </div>
          ) : (
            <ul className="hop-on__list">
              {hosts.map((h) => (
                <li key={h.id} className="hop-on__row">
                  <div className="hop-on__row-head">
                    <span className="hop-on__acronym" title={h.title}>
                      {h.acronym}
                    </span>
                    {h.url ? (
                      <a
                        className="hop-on__link"
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open the project on CORDIS"
                      >
                        Open ↗
                      </a>
                    ) : null}
                  </div>
                  <div className="hop-on__meta">
                    <span className="hop-on__prog">{h.programmeLabel}</span>
                    {h.fundingScheme ? <span className="hop-on__scheme"> · {h.fundingScheme}</span> : null}
                  </div>
                  <div className="hop-on__meta">
                    Started <strong>{h.startDate || "—"}</strong>
                    {h.monthsSinceStart != null ? ` (~${fmt(h.monthsSinceStart)} months ago)` : ""} · runs
                    until {h.endDate || "—"} · {fmt(h.orgCount)} partner{h.orgCount === 1 ? "" : "s"}
                    {h.coordinatorCountry ? ` · led by ${h.coordinatorCountry}` : ""}
                  </div>

                  {(h.countries || []).length > 0 ? (
                    <div className="hop-on__chips" title="Countries already in the consortium">
                      <span className="hop-on__chips-label">In:</span>
                      {h.countries.map((c) => (
                        <span key={c} className="hop-on__chip hop-on__chip--present">{c}</span>
                      ))}
                    </div>
                  ) : null}

                  {(h.wideningGap || []).length > 0 ? (
                    <div
                      className="hop-on__chips"
                      title="Widening countries not yet in the consortium — these could hop on"
                    >
                      <span className="hop-on__chips-label">Gap:</span>
                      {h.wideningGap.map((c) => (
                        <span key={c} className="hop-on__chip hop-on__chip--gap">{c}</span>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {data?.capped ? (
            <div className="hop-on__capped">
              Showing the top {fmt(data.returnedCount)} of {fmt(data.hostCount)} hosts — refine with the
              filters.
            </div>
          ) : null}
        </>
      )}

      <div className="hop-on__prov">
        {data?.provenance ||
          "Early-stage, ongoing Horizon Europe Pillar II / EIC Pathfinder collaborative projects matching the Hop-on Facility host criteria (CORDIS, FP7–Horizon Europe)."}
        {" "}The widening-country list is an official EU reference; each host&rsquo;s gap is that list minus the
        consortium&rsquo;s own countries — not a measure of any country&rsquo;s CORDIS activity.
      </div>
    </Box>
  );

  return typeof document !== "undefined" ? createPortal(card, document.body) : card;
}
