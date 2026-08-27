// src/components/GraphPage/ui/LeftRail.jsx
//
// Floating quick-action rail on the left edge of the canvas (landing
// redesign): Filters (with active-filter badge) opening the GRAPH DATASET
// popover, Compare, Find calls, and the AI assistant. The popover hosts the
// existing LegendToggle panel, so the whole filter feature set (dataset tree,
// node/edge toggles, node search, reset) stays intact — it just floats now.

import React from "react";
import { Tooltip } from "@mui/material";

import LegendToggle from "../../LegendToggle";
import { CompassIcon, FilterIcon, ColumnsIcon, FindCallsIcon, SparklesIcon } from "./railIcons";

const RailButton = ({ title, active, disabled, accent, badge, onClick, children }) => (
  <Tooltip title={title} placement="right">
    <span>
      <button
        type="button"
        className={`kg-leftrail__btn${active ? " is-active" : ""}${accent ? " is-accent" : ""}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={title}
      >
        {children}
        {badge > 0 && <span className="kg-leftrail__badge">{badge}</span>}
      </button>
    </span>
  </Tooltip>
);

export default function LeftRail({
  homeOpen,
  onToggleHome,
  legendOpen,
  onToggleLegend,
  filterCount = 0,
  compareOpen,
  onToggleCompare,
  compareDisabled,
  findOpen,
  onToggleFind,
  findDisabled,
  onOpenAssistant,
  assistantDisabled,
  // LegendToggle passthrough
  hoveredNodeRef,
  graphName,
  loadFromStore,
  onRequestNavigate,
  setGraphName,
  selectedNodeId,
  setSelectedNodeId,
  onResetFilters,
}) {
  return (
    <>
      <div className="kg-leftrail">
        <RailButton
          title={homeOpen ? "Hide home" : "Home — overview & what's closing soon"}
          active={homeOpen}
          onClick={onToggleHome}
        >
          <CompassIcon />
        </RailButton>

        <RailButton
          title={legendOpen ? "Hide filters" : "Filters & controls"}
          active={legendOpen}
          badge={filterCount}
          onClick={onToggleLegend}
        >
          <FilterIcon />
        </RailButton>

        <RailButton
          title={compareDisabled ? "Compare — not available here" : "Compare programmes"}
          active={compareOpen}
          disabled={compareDisabled}
          onClick={onToggleCompare}
        >
          <ColumnsIcon />
        </RailButton>

        <RailButton
          title={findDisabled ? "Find calls — not available here" : "Find calls"}
          active={findOpen}
          disabled={findDisabled}
          onClick={onToggleFind}
        >
          <FindCallsIcon />
        </RailButton>

        <RailButton
          title={assistantDisabled ? "AI search — switch to the graph first" : "Ask AI about calls"}
          accent
          disabled={assistantDisabled}
          onClick={onOpenAssistant}
        >
          <SparklesIcon />
        </RailButton>
      </div>

      {legendOpen && (
        <div className="kg-legend-pop">
          <LegendToggle
            hoveredNodeRef={hoveredNodeRef}
            graphName={graphName}
            loadFromStore={loadFromStore}
            onRequestNavigate={onRequestNavigate}
            setGraphName={setGraphName}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
            onResetFilters={onResetFilters}
            onCollapse={onToggleLegend}
          />
        </div>
      )}
    </>
  );
}
