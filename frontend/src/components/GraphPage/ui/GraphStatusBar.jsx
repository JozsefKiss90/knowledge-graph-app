import React from "react";

const GraphStatusBar = ({ nodes, edges, layoutLabel }) => {
  return (
    <div className="graph-status-bar">
      <div className="graph-status-left">
        <span className="graph-status-dot graph-status-dot-nodes" />
        <span className="graph-status-label">Nodes:</span>
        <span className="graph-status-value">{nodes}</span>

        <span className="graph-status-separator">•</span>

        <span className="graph-status-dot graph-status-dot-edges" />
        <span className="graph-status-label">Edges:</span>
        <span className="graph-status-value">{edges}</span>
      </div>

      <div className="graph-status-right">
        <span className="graph-status-label">Layout:</span>
        <span className="graph-status-value">{layoutLabel}</span>
      </div>
    </div>
  );
};

export default GraphStatusBar;
