// src/components/NestedGraphController.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GraphView from "./GraphView";
import { buildElements } from "./utils/buildElements";

/** Build the synthetic ROOT view: one center + cluster nodes + edges */
function buildRootElements({ clusterKeys }) {
  const centerId = "ROOT_HE";
  const nodes = [
    { data: { id: centerId, label: "Horizon Europe", type: "root" }, group: "nodes" },
    ...clusterKeys.map((k) => ({
      data: { id: k, label: k.replace(/_/g, " "), type: "cluster" },
      group: "nodes",
    })),
  ];
  const edges = clusterKeys.map((k) => ({
    data: { id: `${centerId}-${k}`, source: centerId, target: k, type: "BELONGS_TO" },
    group: "edges",
  }));
  return { nodeElements: nodes, edgeElements: edges };
}

export default function NestedGraphController({
  initialGraphName = "ROOT",
  layoutOptions,
  onCyReady,
  onNodeHover,
  onHoverNodeIdChange,
  loadFromStore, // (key) => raw {nodes, rels} OR null; "__keys__" -> cluster keys
}) {
  const graphRef = useRef(null);

  const [levels, setLevels] = useState(() => [
    { key: "ROOT", title: "Horizon Europe", graphName: "ROOT", elements: { nodeElements: [], edgeElements: [] } },
  ]);
  const current = levels[levels.length - 1];

  // hydrate ROOT from whatever cluster keys are available
  useEffect(() => {
    const keys = (loadFromStore?.("__keys__") || []).filter((k) => k !== "HE_2025");
    const rootEls = buildRootElements({ clusterKeys: keys });
    setLevels([{ key: "ROOT", title: "Horizon Europe", graphName: "ROOT", elements: rootEls }]);
  }, [loadFromStore]);

  useEffect(() => {
    graphRef.current?.rerunLayout?.();
  }, [current?.key, layoutOptions]);

  const openCluster = useCallback((clusterKey) => {
    const raw = loadFromStore?.(clusterKey); // preloaded OR derived from HE_2025
    const elements = raw ? buildElements(raw) : { nodeElements: [], edgeElements: [] };
    setLevels((prev) => [
      ...prev,
      { key: clusterKey, title: clusterKey.replace(/_/g, " "), graphName: clusterKey, elements },
    ]);
  }, [loadFromStore]);

  const onDestinationToggle = useCallback((cy, destinationId) => {
    const dest = cy.$id(destinationId);
    const calls = dest.outgoers('edge[type = "HAS_CALL"]').targets();
    const callNodes = calls.length
      ? calls
      : dest.outgoers("edge").targets().filter('node[type = "Call"], node[category = "Call"]');
    callNodes.forEach((n) => n.toggleClass("call-visible").toggleClass("call-hidden"));
    callNodes.connectedEdges().forEach((e) => e.toggleClass("call-visible").toggleClass("call-hidden"));
  }, []);

  const popLevel = useCallback(() => {
    setLevels((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const nestedHandlers = useMemo(() => ({
    onClusterOpen: (data) => {
      if (current?.key === "ROOT" && data?.id && data?.id !== "HE_2025") openCluster(data.id);
    },
    onDestinationToggle,
    popLevel,
  }), [current?.key, openCluster, onDestinationToggle, popLevel]);

  return (
    <>
      <div className="graph-breadcrumb" style={breadcrumbStyle}>
        {levels.map((lvl, i) => {
          const isActive = i === levels.length - 1;
          return (
            <button
              key={lvl.key}
              onClick={() => setLevels((prev) => prev.slice(0, i + 1))}
              style={{ ...crumbStyle, ...(isActive ? crumbActiveStyle : null) }}
              title={lvl.title}
            >
              {lvl.title}
            </button>
          );
        })}
        {levels.length > 1 && (
          <button onClick={popLevel} style={upStyle} aria-label="Back one level">↑</button>
        )}
      </div>

      <GraphView
        ref={graphRef}
        graphData={current.elements}
        graphName={current.graphName}
        layoutOptions={layoutOptions}
        onCyReady={(cy) => {
          if (current.key !== "ROOT") cy.nodes('[type = "Call"], [category = "Call"]').addClass("call-hidden");
          onCyReady?.(cy);
        }}
        onNodeHover={onNodeHover}
        onHoverNodeIdChange={onHoverNodeIdChange}
        nestedHandlers={nestedHandlers}
      />
    </>
  );
}

// styles
const breadcrumbStyle = { position: "absolute", top: 12, left: 440, zIndex: 5, display: "flex", gap: 8 };
const crumbStyle = { border: 0, padding: "6px 10px", borderRadius: 999, background: "rgba(0,0,0,0.35)", color: "#fff", fontWeight: 600, cursor: "pointer" };
const crumbActiveStyle = { background: "rgba(0,0,0,0.6)" };
const upStyle = { marginLeft: 8, border: 0, padding: "6px 10px", borderRadius: 999, background: "rgba(0,0,0,0.5)", color: "#fff", cursor: "pointer" };
