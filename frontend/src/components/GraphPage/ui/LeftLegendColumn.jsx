import React from "react";
import { Col } from "react-bootstrap";
import { IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

import LegendToggle from "../../LegendToggle";

export default function LeftLegendColumn({
  isLegendCollapsed,
  setIsLegendCollapsed,
  hoveredNodeRef,
  graphName,
  loadFromStore,
  onRequestNavigate,
  setGraphName,
  selectedNodeId,
  setSelectedNodeId,
}) {
  return (
    <Col
      xs="auto"
      className="p-0 sidebar-transition"
      style={{
        width: isLegendCollapsed ? "var(--legend-collapsed-width)" : "var(--legend-width)",
        position: "relative",
      }}
    >
      {isLegendCollapsed ? (
        <div className="legend-sidebar legend-filters-panel is-collapsed">
          <div className="legend-header">
            <div className="legend-header-left" />
            <div className="legend-header-center">
              <span className="legend-header-title">Filters &amp; Controls</span>
            </div>
            <div className="legend-header-right">
              <IconButton
                onClick={() => setIsLegendCollapsed(false)}
                size="small"
                title="Expand Filters & Controls"
                className="legend-collapse-button"
              >
                <ChevronLeftIcon />
              </IconButton>
            </div>
          </div>
        </div>
      ) : (
        <LegendToggle
          hoveredNodeRef={hoveredNodeRef}
          graphName={graphName}
          loadFromStore={loadFromStore}
          onRequestNavigate={onRequestNavigate}
          setGraphName={setGraphName}
          selectedNodeId={selectedNodeId}
          setSelectedNodeId={setSelectedNodeId}
          onCollapse={() => setIsLegendCollapsed(true)}
        />
      )}
    </Col>
  );
}
