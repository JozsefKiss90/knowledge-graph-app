// src/components/GraphPage/GraphPage.js
import React, { useMemo } from "react";
import NestedGraphController from "../NestedGraphController";
import { useGraphData, GRAPH_ENDPOINTS } from "./useGraphData";
import { layoutConfig } from "../utils/layoutConfig";
import { useLayoutOptions } from "./useLayoutOptions";

export default function GraphPage() {
  const { ready, graphName, setGraphName, loadFromStore } = useGraphData();
  const { layoutOptions: userLayout } = useLayoutOptions();

  const effectiveLayout = useMemo(() => {
    const base = graphName === "HE_2025" ? layoutConfig.HE_2025 : layoutConfig.DEFAULT;
    return { ...base, ...userLayout, name: userLayout?.name || base?.name || "cose-bilkent" };
  }, [graphName, userLayout]);

  if (!ready) return <div className="loading">Loading…</div>;

  return (
    <div className="graph-page" style={{ position: "relative", width: "100%", height: "100vh" }}>
      <NestedGraphController
        initialGraphName="ROOT"
        layoutOptions={effectiveLayout}
        loadFromStore={loadFromStore}
        onCyReady={() => {}}
        onNodeHover={() => {}}
        onHoverNodeIdChange={() => {}}
      />
    </div>
  );
}
