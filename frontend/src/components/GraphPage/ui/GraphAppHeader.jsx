import React from "react";

export default function GraphAppHeader() {
  return (
    <div className="graph-app-header">
      <div className="graph-app-logo">
        <span className="graph-app-logo-mark graph-app-logo-mask" aria-hidden="true" />
      </div>
      <div className="graph-app-header-text">
        <div className="graph-app-title">Horizon Europe Knowledge Graph</div>
        <div className="graph-app-subtitle">Explore relationships between research projects, funding, and organizations</div>
      </div>
    </div>
  );
}
