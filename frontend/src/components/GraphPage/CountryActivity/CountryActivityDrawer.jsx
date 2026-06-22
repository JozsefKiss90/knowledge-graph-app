import React from "react";
import { createPortal } from "react-dom";
import { Box, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PublicIcon from "@mui/icons-material/Public";

const fmt = (n) => (n || 0).toLocaleString();

/**
 * B4 — Country activity overlay: a side drawer (B5 field-explorer pattern, createPortal to body) that lets
 * you pick any country and see where its organisations have been funded across the graph. Picking a country
 * paints the call nodes (green = led/coordinated, lighter green = joined/partnered, dimmed = EU-funded but no
 * activity from this country) and lists the CORDIS research SUBJECTS it is most active in — the funded
 * research areas, NOT the Horizon Europe call/tender titles (those are open opportunities, so listing them as
 * "active areas" would be misleading). Pure read of existing CORDIS edges. Honest: this is EU-funded
 * participation, not quality/impact; absence is not absence of activity, and organisations funded
 * nationally/privately won't appear.
 */
export default function CountryActivityDrawer({ open, onClose, country, setCountry, data, loading }) {
  if (!open) return null;

  const countries = data?.facets?.countries || [];
  const hasData = countries.length > 0;
  const areas = data?.areas || [];
  const picked = !!country;

  const card = (
    <Box className="country-activity-drawer">
      <Box className="country-activity-drawer__header">
        <PublicIcon sx={{ fontSize: 20, color: "var(--primary)" }} />
        <Typography sx={{ fontWeight: 700, fontSize: 15, flex: 1 }}>
          Country activity (CORDIS)
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: "var(--foreground-muted)", "&:hover": { color: "var(--foreground)" } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <div className="country-activity__hint">
        Pick a country to see where its organisations have been funded across the graph. Green call nodes are
        areas it has <strong>led</strong> (coordinated); lighter green it has <strong>joined</strong>
        {" "}(partnered); dimmed areas are EU-funded but have no recorded activity from this country.
        Highlights show on layers where call nodes are visible. EU-funded participation only — not a measure of
        quality, and organisations funded nationally or privately won&rsquo;t appear.
      </div>

      {loading && !data ? (
        <div className="country-activity__empty">Loading country activity…</div>
      ) : !hasData ? (
        <div className="country-activity__empty">
          No CORDIS participation data yet. Run the CORDIS ingest (<code>/cordis/tag-calls</code>) to populate
          funded-project organisations, then reopen this panel.
        </div>
      ) : (
        <>
          <label className="country-activity__picker">
            <span className="country-activity__picker-label">Country</span>
            <select value={country || ""} onChange={(e) => setCountry(e.target.value)}>
              <option value="">Select a country…</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({fmt(c.areas)} area{c.areas === 1 ? "" : "s"})
                </option>
              ))}
            </select>
          </label>

          <div className="country-activity__legend">
            <span><i className="country-activity__swatch country-activity__swatch--coord" /> Led (coordinated)</span>
            <span><i className="country-activity__swatch country-activity__swatch--part" /> Joined (partnered)</span>
            <span><i className="country-activity__swatch country-activity__swatch--dim" /> Funded, no activity</span>
          </div>

          {!picked ? (
            <div className="country-activity__calls-empty">
              Select a country above to see the CORDIS research areas its organisations are active in (and to
              highlight them on the graph).
            </div>
          ) : (
            <>
              <div className="country-activity__headline">
                <strong>{country}</strong> — active in {fmt(data.areaCount)} research area
                {data.areaCount === 1 ? "" : "s"} · {fmt(data.totalCoordinated)} led ·{" "}
                {fmt(data.totalPartnered)} joined
              </div>

              {areas.length === 0 ? (
                <div className="country-activity__calls-empty">
                  No recorded CORDIS activity for {country}.
                </div>
              ) : (
                <ul className="country-activity__list">
                  {areas.map((a) => (
                    <li key={a.subject} className="country-activity__row">
                      <div className="country-activity__main">
                        <span className="country-activity__name" title={a.subject}>
                          {a.subject}
                        </span>
                        <div className="country-activity__subject">
                          {fmt(a.orgCount)} organisation{a.orgCount === 1 ? "" : "s"}
                        </div>
                      </div>
                      <span
                        className="country-activity__counts"
                        title={`${a.coordinatedCount} led · ${a.partneredCount} joined · ${a.projectCount} distinct funded projects`}
                      >
                        <span className="country-activity__count-total">{fmt(a.projectCount)} proj</span>
                        <span className="country-activity__count-split">
                          {fmt(a.coordinatedCount)} led · {fmt(a.partneredCount)} joined
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {data.capped ? (
                <div className="country-activity__capped">
                  Showing the top {fmt(data.returnedCount)} of {fmt(data.areaCount)} research areas.
                </div>
              ) : null}
            </>
          )}
        </>
      )}

      <div className="country-activity__prov">
        {data?.provenance ||
          "Country organisations participating in CORDIS-funded projects (CORDIS, FP7–Horizon Europe)"}
      </div>
    </Box>
  );

  return typeof document !== "undefined" ? createPortal(card, document.body) : card;
}
