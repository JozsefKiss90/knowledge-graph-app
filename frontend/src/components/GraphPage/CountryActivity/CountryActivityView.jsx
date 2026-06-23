import React from "react";
import useCountryActivity from "./useCountryActivity";

const fmt = (n) => (n || 0).toLocaleString();

/**
 * B4 — Country activity (dashboard panel body): pick any country and see where its organisations have been
 * funded across the graph. Picking a country also paints the graph's call nodes (green = led/coordinated,
 * lighter green = joined/partnered, dimmed = EU-funded but no activity from this country — handled in
 * GraphMainColumn) and lists the CORDIS research SUBJECTS the country is most active in. Pure read of existing
 * CORDIS edges. Honest: EU-funded participation, not quality/impact; absence is not absence of activity, and
 * organisations funded nationally/privately won't appear.
 *
 * Country selection is lifted to GraphPage (`countryOverlayCode`) so the graph paint follows the choice when
 * the user switches back to the graph view. Data is fetched here (shares the module cache with the graph
 * paint's own fetch). The `country-activity*` class names are unchanged so the existing styles apply.
 */
export default function CountryActivityView({ country, setCountry }) {
  const { loading, data } = useCountryActivity(country, true);

  const countries = data?.facets?.countries || [];
  const hasData = countries.length > 0;
  const areas = data?.areas || [];
  const picked = !!country;

  return (
    <div className="country-activity dash-tool-panel__tool">
      <div className="country-activity__hint">
        Pick a country to see where its organisations have been funded across the graph. Green call nodes are
        areas it has <strong>led</strong> (coordinated); lighter green it has <strong>joined</strong>
        {" "}(partnered); dimmed areas are EU-funded but have no recorded activity from this country.
        Highlights show on the graph layers where call nodes are visible. EU-funded participation only — not a
        measure of quality, and organisations funded nationally or privately won&rsquo;t appear.
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
    </div>
  );
}
