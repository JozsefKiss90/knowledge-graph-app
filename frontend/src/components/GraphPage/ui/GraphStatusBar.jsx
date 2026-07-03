// src/components/GraphPage/ui/GraphStatusBar.jsx
//
// Landing redesign: the old full-width status strip is now two floating
// capsules over the canvas — node/edge counts bottom-left, the current layout
// bottom-right (click to switch layout when switching is available).

import React, { useState } from "react";
import { Menu, MenuItem, ListItemIcon } from "@mui/material";
import { GridIcon, FlowIcon, ChevronDownIcon } from "./railIcons";

const GraphStatusBar = ({
  nodes,
  edges,
  layoutLabel,
  layoutMode,
  onLayoutModeChange,
  layoutSwitchVisible = false,
}) => {
  const [anchor, setAnchor] = useState(null);
  const isTree = layoutMode === "breadthfirst";
  const pillLabel = String(layoutLabel || "")
    .replace(/\s*layout\s*$/i, "")
    .toUpperCase();

  return (
    <div className="graph-status-overlay">
      <div className="graph-status-pill">
        <span className="graph-status-dot graph-status-dot-nodes" />
        <span className="graph-status-value">{nodes}</span>
        <span className="graph-status-label">NODES</span>
        <span className="graph-status-separator">·</span>
        <span className="graph-status-dot graph-status-dot-edges" />
        <span className="graph-status-value">{edges}</span>
        <span className="graph-status-label">EDGES</span>
      </div>

      <button
        type="button"
        className="graph-layout-pill"
        onClick={(e) => layoutSwitchVisible && setAnchor(e.currentTarget)}
        disabled={!layoutSwitchVisible}
        title={layoutSwitchVisible ? "Switch layout" : layoutLabel}
      >
        {pillLabel}
        {layoutSwitchVisible && <ChevronDownIcon size={11} />}
      </button>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <MenuItem
          selected={!isTree}
          onClick={() => {
            onLayoutModeChange?.("cose-bilkent");
            setAnchor(null);
          }}
        >
          <ListItemIcon><GridIcon size={15} /></ListItemIcon>
          Force-directed
        </MenuItem>
        <MenuItem
          selected={isTree}
          onClick={() => {
            onLayoutModeChange?.("breadthfirst");
            setAnchor(null);
          }}
        >
          <ListItemIcon><FlowIcon size={15} /></ListItemIcon>
          Hierarchical
        </MenuItem>
      </Menu>
    </div>
  );
};

export default GraphStatusBar;
