import React from "react";

const TOP_N = 10;
const ORGS_COLOR = "#60A5FA";   // organisations active (presence)
const AREAS_COLOR = "#34D399";  // research areas touched (breadth)

const fmt = (n) => (n || 0).toLocaleString();

// CORDIS country codes → display names. Mostly ISO 3166-1 alpha-2, with the EU's own quirks (EL=Greece,
// UK=United Kingdom) plus the GR/GB aliases. Unknown codes fall back to the raw code — no invented names.
const COUNTRY_NAMES = {
  AT: "Austria", BE: "Belgium", BG: "Bulgaria", HR: "Croatia", CY: "Cyprus",
  CZ: "Czechia", DK: "Denmark", EE: "Estonia", FI: "Finland", FR: "France",
  DE: "Germany", EL: "Greece", GR: "Greece", HU: "Hungary", IE: "Ireland",
  IT: "Italy", LV: "Latvia", LT: "Lithuania", LU: "Luxembourg", MT: "Malta",
  NL: "Netherlands", PL: "Poland", PT: "Portugal", RO: "Romania", SK: "Slovakia",
  SI: "Slovenia", ES: "Spain", SE: "Sweden",
  NO: "Norway", IS: "Iceland", LI: "Liechtenstein", CH: "Switzerland",
  UK: "United Kingdom", GB: "United Kingdom", TR: "Türkiye", IL: "Israel",
  RS: "Serbia", UA: "Ukraine", MK: "North Macedonia", AL: "Albania",
  ME: "Montenegro", BA: "Bosnia and Herzegovina", MD: "Moldova", GE: "Georgia",
  AM: "Armenia", FO: "Faroe Islands", TN: "Tunisia", XK: "Kosovo",
  US: "United States", CN: "China", JP: "Japan", CA: "Canada", AU: "Australia",
  IN: "India", BR: "Brazil", ZA: "South Africa", RU: "Russia", KR: "South Korea",
  NZ: "New Zealand", EG: "Egypt", MA: "Morocco",
};
const countryName = (code) => COUNTRY_NAMES[code] || code;

function Bar({ value, max, color }) {
  return (
    <div className="dash-funding__bar-track">
      <div
        className="dash-funding__bar-fill"
        style={{ width: `${Math.max((value / max) * 100, 2)}%`, backgroundColor: color }}
      />
    </div>
  );
}

/**
 * F5 — Top countries leaderboard: the aggregate counterpart to B4's single-country graph overlay. Ranks the
 * countries whose organisations are most present across the tracked funded portfolio. Reuses the B4
 * /country-activity facets (zero backend cost). Organisations active and research areas touched are shown as
 * TWO distinct measures, never blended into one score. Honest framing: EU-funded participation, not quality;
 * work funded nationally/privately isn't in CORDIS, so absence is not absence of activity. Rendered only when
 * CORDIS participation data exists (gated by the parent on the F1 summary).
 */
export default function CordisCountryLeaderboard({ data, loading, onSelectCountry }) {
  if (loading) return null;
  const countries = data?.facets?.countries || [];
  if (!countries.length) return null;

  // Rank by organisations active (presence), then areas, then code — "most present" is the F5 question. The
  // facets arrive sorted by areas; we re-sort by orgs so the headline measure leads.
  const ranked = [...countries].sort(
    (a, b) => (b.orgs || 0) - (a.orgs || 0) || (b.areas || 0) - (a.areas || 0) || a.code.localeCompare(b.code)
  );
  const top = ranked.slice(0, TOP_N);
  const othersCount = ranked.length - top.length;

  // Each measure scaled to its own max — organisations and areas are different measures, never a shared axis.
  const maxOrgs = Math.max(...top.map((c) => c.orgs || 0), 1);
  const maxAreas = Math.max(...top.map((c) => c.areas || 0), 1);

  return (
    <div className="dash-card dash-country-board">
      <div className="dash-card__header">
        <div>
          <h3 className="dash-card__title">Top countries by funded participation (CORDIS)</h3>
          <span className="dash-card__subtitle">
            {fmt(ranked.length)} countries · organisations &amp; research areas
          </span>
        </div>
      </div>

      <div className="dash-funding__bars dash-country-board__bars">
        {top.map((c) => (
          <button
            key={c.code}
            type="button"
            className="dash-funding__row dash-funding__row--both dash-country-board__row"
            onClick={() => onSelectCountry?.(c.code)}
            title={`Show ${countryName(c.code)} on the country-activity overlay`}
          >
            <span className="dash-funding__label" title={`${countryName(c.code)} (${c.code})`}>
              {countryName(c.code)}
            </span>
            <div className="dash-funding__measures">
              <div className="dash-funding__measure">
                <span className="dash-funding__measure-tag">Orgs</span>
                <Bar value={c.orgs || 0} max={maxOrgs} color={ORGS_COLOR} />
                <span className="dash-funding__value">{fmt(c.orgs)}</span>
              </div>
              <div className="dash-funding__measure">
                <span className="dash-funding__measure-tag">Areas</span>
                <Bar value={c.areas || 0} max={maxAreas} color={AREAS_COLOR} />
                <span className="dash-funding__value">{fmt(c.areas)}</span>
              </div>
            </div>
          </button>
        ))}
        {othersCount > 0 && (
          <div className="dash-field-mix__others">
            +{fmt(othersCount)} more {othersCount === 1 ? "country" : "countries"} with funded participation
          </div>
        )}
      </div>

      <p className="dash-funding__note">
        Organisations active and research areas touched, shown as separate measures. EU-funded participation,
        not scientific quality; "most present" is not "best". Work funded nationally or privately isn't in
        CORDIS, so absence is not absence of activity.
      </p>
    </div>
  );
}
