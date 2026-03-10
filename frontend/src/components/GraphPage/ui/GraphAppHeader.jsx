import React from "react";

export default function GraphAppHeader() {
  return (
    <div className="graph-app-header">
      <div className="graph-app-logo">
        <span className="graph-app-logo-mark graph-app-logo-mask" aria-hidden="true" />
      </div>
      <div className="graph-app-header-text">
        <div className="graph-app-title">EU Knowledge Graph</div>
        <div className="graph-app-subtitle">Explore relationships between funding programmes, topics, and research projects</div>
      </div>
    </div>
  );
}
