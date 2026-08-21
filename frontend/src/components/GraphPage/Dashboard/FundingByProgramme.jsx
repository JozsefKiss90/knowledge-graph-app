import React, { useMemo, useState } from "react";
import { PROGRAMME_DISPLAY } from "../TimelineScrubber/utils";

function formatBudget(val) {
  if (val >= 1e9) return `€${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `€${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `€${(val / 1e3).toFixed(0)}K`;
  if (val > 0) return `€${val.toLocaleString()}`;
  return "—";
}

const TABS = [
  { key: "planned", label: "Planned" },
  { key: "awarded", label: "Awarded" },
  { key: "both", label: "Both" },
];

function Bar({ value, max, color, awarded }) {
  return (
    <div className="dash-funding__bar-track">
      <div
        className={`dash-funding__bar-fill${awarded ? " dash-funding__bar-fill--awarded" : ""}`}
        style={{ width: `${Math.max((value / max) * 100, 2)}%`, backgroundColor: color }}
      />
    </div>
  );
}

// One programme row, rendered per the active tab. A measure with no value (e.g. a programme with no CORDIS
// match in the Awarded view) renders a muted "no data" marker — never a zero-length bar that would read as
// "€0 awarded" when the truth is "no funded-project evidence here".
function FundingRow({ row, mode, maxPlanned, maxAwarded }) {
  if (mode === "both") {
    return (
      <div className="dash-funding__row dash-funding__row--both">
        <span className="dash-funding__label">{row.label}</span>
        <div className="dash-funding__measures">
          <div className="dash-funding__measure">
            <span className="dash-funding__measure-tag">Planned</span>
            {row.planned != null
              ? <Bar value={row.planned} max={maxPlanned} color={row.color} />
              : <span className="dash-funding__nodata">no data</span>}
            <span className="dash-funding__value">
              {row.planned != null ? formatBudget(row.planned) : "—"}
            </span>
          </div>
          <div className="dash-funding__measure">
            <span className="dash-funding__measure-tag">Awarded</span>
            {row.awarded != null
              ? <Bar value={row.awarded} max={maxAwarded} color={row.color} awarded />
              : <span className="dash-funding__nodata">no data</span>}
            <span className="dash-funding__value">
              {row.awarded != null ? formatBudget(row.awarded) : "—"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const isAwarded = mode === "awarded";
  const value = isAwarded ? row.awarded : row.planned;
  const max = isAwarded ? maxAwarded : maxPlanned;
  return (
    <div className="dash-funding__row">
      <span className="dash-funding__label">{row.label}</span>
      {value != null
        ? <Bar value={value} max={max} color={row.color} awarded={isAwarded} />
        : <span className="dash-funding__nodata">no data</span>}
      <span className="dash-funding__value">{value != null ? formatBudget(value) : "—"}</span>
    </div>
  );
}

// F2 (idea A4): Planned vs Awarded. Repurposes the card's three formerly-identical tabs into
// Planned / Awarded / Both. Planned = the work programme's indicative budget on offer (already computed
// client-side). Awarded = EU contribution to past CORDIS-funded projects, per programme. The two are
// different measures across different eras, so they are shown side by side and never subtracted.
//
// When no CORDIS data is ingested (`awardedByProgrammeKey` empty/absent) the card behaves exactly as before:
// the top-level `callsByProgramme` planned bars, with the Awarded/Both tabs disabled.
export default function FundingByProgramme({ callsByProgramme, plannedByProgrammeKey, awardedByProgrammeKey }) {
  const cordisActive = !!awardedByProgrammeKey && Object.keys(awardedByProgrammeKey).length > 0;
  const [tab, setTab] = useState("planned");
  const activeTab = cordisActive ? tab : "planned";

  // Rows to render. Without CORDIS data: today's top-level programme bars. With CORDIS data: the union of
  // programme keys present in the planned and/or awarded maps, labelled/coloured via PROGRAMME_DISPLAY.
  const rows = useMemo(() => {
    if (!cordisActive) {
      return (callsByProgramme || []).map((p) => ({
        key: p.key,
        label: p.label,
        color: p.color,
        planned: p.budget,
        awarded: null,
      }));
    }
    const planned = plannedByProgrammeKey || {};
    const awarded = awardedByProgrammeKey || {};
    const keys = Array.from(new Set([...Object.keys(planned), ...Object.keys(awarded)]));
    return keys.map((key) => {
      const disp = PROGRAMME_DISPLAY[key] || {};
      const p = planned[key];
      const a = awarded[key];
      return {
        key,
        label: disp.label || key,
        color: disp.color || "#47a9ff",
        planned: p ? p.budget : null,
        awarded: a ? a.awardedEc : null,
      };
    });
  }, [cordisActive, callsByProgramme, plannedByProgrammeKey, awardedByProgrammeKey]);

  // Sort by the measure that tells each tab's story (Both leads with the awarded track record).
  const sorted = useMemo(() => {
    const r = [...rows];
    if (activeTab === "awarded" || activeTab === "both") {
      r.sort((a, b) => (b.awarded || 0) - (a.awarded || 0) || (b.planned || 0) - (a.planned || 0));
    } else {
      r.sort((a, b) => (b.planned || 0) - (a.planned || 0));
    }
    return r;
  }, [rows, activeTab]);

  // Each measure is scaled to its own max — planned and awarded share no axis (different measures/eras).
  const maxPlanned = Math.max(...rows.map((r) => r.planned || 0), 1);
  const maxAwarded = Math.max(...rows.map((r) => r.awarded || 0), 1);

  return (
    <div className="dash-card dash-funding">
      <div className="dash-card__header">
        <h3 className="dash-card__title">Funding by programme</h3>
        <div className="dash-card__tabs">
          {TABS.map((t) => {
            const disabled = !cordisActive && t.key !== "planned";
            return (
              <button
                key={t.key}
                type="button"
                className={`dash-card__tab${activeTab === t.key ? " dash-card__tab--active" : ""}${disabled ? " dash-card__tab--disabled" : ""}`}
                onClick={() => { if (!disabled) setTab(t.key); }}
                disabled={disabled}
                title={disabled ? "No CORDIS funded-project data ingested yet" : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="dash-funding__bars">
        {sorted.map((p) => (
          <FundingRow
            key={p.key}
            row={p}
            mode={activeTab}
            maxPlanned={maxPlanned}
            maxAwarded={maxAwarded}
          />
        ))}
      </div>

      {cordisActive && (
        <p className="dash-funding__note">
          Planned is the current work programme's indicative budget on offer; Awarded is the EU contribution to
          past CORDIS-funded projects (historical, across several Framework Programmes). Different measures —
          shown side by side, not subtracted.
        </p>
      )}
    </div>
  );
}
