import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import { formatRangeParts } from "../TimelineScrubber/utils";

function formatTimelineLabel(sel) {
  if (!sel?.start || !sel?.end) return "";
  const parts = formatRangeParts(sel.start, sel.end);
  if (!parts) return "";
  const sameYear = sel.start.getFullYear() === sel.end.getFullYear();
  if (sameYear) {
    const startMonth = parts.start.replace(/\s+\d{4}$/, ""); // "Jun 2026" -> "Jun"
    return `${startMonth}–${parts.end}`;
  }
  return `${parts.start} – ${parts.end}`;
}

function Chip({ label, onClear, clearLabel }) {
  return (
    <span className="graph-constraint-chip">
      <span className="graph-constraint-chip__label">{label}</span>
      <button
        type="button"
        className="graph-constraint-chip__clear"
        onClick={onClear}
        aria-label={clearLabel}
        title={clearLabel}
      >
        <CloseIcon fontSize="inherit" />
      </button>
    </span>
  );
}

export default function GraphConstraintBar({
  timelineSelection,
  onClearTimeline,
  countryCode,
  onClearCountry,
  assistantCount = 0,
  assistantQuery = "",
  assistantSource = "ai",
  onClearAssistant,
  compareCount = 0,
  onClearCompare,
  onResetFilters,
}) {
  const highlightLabel = assistantSource === "find" ? "Find" : "AI";
  const hasTimeline = !!(timelineSelection?.start && timelineSelection?.end);
  const hasCountry = !!countryCode;
  const hasAssistant = assistantCount > 0;
  const hasCompare = compareCount > 0;
  if (!(hasTimeline || hasCountry || hasAssistant || hasCompare)) return null;

  return (
    <div className="graph-constraint-bar" role="region" aria-label="Active filters">
      <span className="graph-constraint-bar__lead">Active filters</span>
      <div className="graph-constraint-bar__chips">
        {hasTimeline && (
          <Chip
            label={`Timeline: ${formatTimelineLabel(timelineSelection)}`}
            onClear={onClearTimeline}
            clearLabel="Clear timeline filter"
          />
        )}
        {hasCountry && (
          <Chip
            label={`Country: ${countryCode}`}
            onClear={onClearCountry}
            clearLabel="Clear country overlay"
          />
        )}
        {hasAssistant && (
          <Chip
            label={
              assistantQuery
                ? `${highlightLabel}: “${assistantQuery}”`
                : `${highlightLabel} highlight (${assistantCount})`
            }
            onClear={onClearAssistant}
            clearLabel={`Clear ${highlightLabel} highlight`}
          />
        )}
        {hasCompare && (
          <Chip
            label={`Compare: ${compareCount}`}
            onClear={onClearCompare}
            clearLabel="Clear compare selection"
          />
        )}
      </div>
      <button type="button" className="graph-constraint-bar__clear-all" onClick={onResetFilters}>
        Clear all
      </button>
    </div>
  );
}
