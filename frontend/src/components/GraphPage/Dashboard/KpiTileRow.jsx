import React from "react";
import SavingsIcon from "@mui/icons-material/Savings";
import CampaignIcon from "@mui/icons-material/Campaign";
import ScienceIcon from "@mui/icons-material/Science";
import EuroIcon from "@mui/icons-material/Euro";
import GroupsIcon from "@mui/icons-material/Groups";
import PublicIcon from "@mui/icons-material/Public";
import EventIcon from "@mui/icons-material/Event";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { formatValue, formatUnit } from "./KpiCard";

// rgba tint of a hex colour (mockup `tint` helper) for the icon-tile backgrounds.
function tint(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// Reuse the original KpiCard formatters so figures keep the exact same formatting
// (currency scaled to €B/€M/€K, counts via toLocaleString) — no re-derivation in JSX.
function display(value, currency) {
  const v = Number(value) || 0;
  if (currency) {
    const num = formatValue(v, "currency");
    const unit = formatUnit(v).replace("€", ""); // "€B" -> "B"
    return `€${num}${unit}`;
  }
  return formatValue(v);
}

function Tile({ icon: Icon, tone, label, value, currency, sub, badge, badgeVariant }) {
  return (
    <div className="dash-kpitile">
      <div
        className="dash-kpitile__icon"
        style={{ background: tint(tone, 0.13), color: tone }}
      >
        <Icon fontSize="inherit" />
      </div>
      <div className="dash-kpitile__text">
        <div className="dash-kpitile__label">
          <span className="dash-kpitile__label-text">{label}</span>
          {badge && (
            <span
              className={`dash-kpitile__badge dash-kpitile__badge--${badgeVariant || "outline"}`}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="dash-kpitile__value">{display(value, currency)}</div>
        {sub && <div className="dash-kpitile__sub">{sub}</div>}
      </div>
    </div>
  );
}

/**
 * Redesigned 6-across KPI tile row.
 *
 * Honesty hide-when-empty: when CORDIS is inactive (no funded-project data ingested) we do
 * NOT show four CORDIS zeros — we fall back to the planned-only KPI set (the original
 * KpiCardsRow's four measures). When CORDIS is active we show the full mixed set: planned
 * (on offer) + CORDIS awarded reality. Planned and awarded stay separate measures, never
 * blended; counts and euros stay separate tiles. Copy preserved from KpiCardsRow / CordisKpiRow.
 */
export default function KpiTileRow({
  // planned (work-programme) side — from useDashboardData
  totalOnOffer,
  openCalls,
  closingIn30d,
  topicsTracked,
  programmeCount,
  // CORDIS funded-reality side — from useCordisPortfolio
  cordis,
  cordisActive,
}) {
  const plannedTile = {
    icon: SavingsIcon,
    tone: "#7551FF",
    label: "Planned (on offer)",
    value: totalOnOffer,
    currency: true,
    sub: `across ${(programmeCount || 0).toLocaleString()} programmes`,
    badge: "offer",
    badgeVariant: "outline",
  };
  const openTile = {
    icon: CampaignIcon,
    tone: "#01ADC4",
    label: "Open calls",
    value: openCalls,
    sub: "currently accepting",
  };

  let tiles;
  if (cordisActive && cordis) {
    // Full mixed set: planned-on-offer + open calls + the four CORDIS awarded measures.
    tiles = [
      plannedTile,
      openTile,
      {
        icon: ScienceIcon,
        tone: "#22C55E",
        label: "Funded projects",
        value: cordis.projectCount,
        sub: "linked to tracked calls",
      },
      {
        icon: EuroIcon,
        tone: "#FBBF24",
        label: "EU € awarded",
        value: cordis.totalEcContribution,
        currency: true,
        sub: "EU contribution (historical)",
        badge: "funded",
        badgeVariant: "filled",
      },
      {
        icon: GroupsIcon,
        tone: "#F472B6",
        label: "Organisations",
        value: cordis.organisationCount,
        sub: "funded participants",
      },
      {
        icon: PublicIcon,
        tone: "#60A5FA",
        label: "Countries",
        value: cordis.countryCount,
        sub: "with funded organisations",
      },
    ];
  } else {
    // Planned-only fallback (no row of CORDIS zeros).
    tiles = [
      plannedTile,
      openTile,
      {
        icon: EventIcon,
        tone: "#FBBF24",
        label: "Closing in 30d",
        value: closingIn30d,
        sub: "upcoming deadlines",
      },
      {
        icon: LocalOfferIcon,
        tone: "#22C55E",
        label: "Topics tracked",
        value: topicsTracked,
        sub: "across all calls",
      },
    ];
  }

  return (
    <div
      className={`dash-kpitiles${cordisActive ? "" : " dash-kpitiles--planned-only"}`}
    >
      {tiles.map((t) => (
        <Tile key={t.label} {...t} />
      ))}
    </div>
  );
}
