// NestedGraphController.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GraphView from "./GraphView";
import { buildElements } from "./utils/buildElements";

/** Synthetic ROOT graph */
function buildRootElements({ clusterKeys }) {
  const centerId = "ROOT_HE";
  const nodes = [
    {
      data: { id: centerId, label: "Horizon Europe", type: "root" },
      group: "nodes",
    },
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

function clearHover(onNodeHover, onHoverNodeIdChange) {
  onNodeHover?.(null);
  onHoverNodeIdChange?.(null);
}

function cleanKey(k) {
  return (k || "").replace("_cose", "");
}

export default function NestedGraphController({
  initialGraphName = "ROOT",
  layoutOptions,
  onCyReady,
  onNodeHover,
  onHoverNodeIdChange,
  loadFromStore,
  onLevelChange,
  targetGraphName,
  renderLevelBar,
}) {
  const graphRef = useRef(null);

  const [levels, setLevels] = useState(() => [
    {
      key: initialGraphName,
      title: "Horizon Europe",
      graphName: initialGraphName,
      elements: { nodeElements: [], edgeElements: [] },
    },
  ]);

  const current = levels[levels.length - 1];
  const lastAppliedTargetRef = useRef(initialGraphName);

  const handleLevelClick = useCallback(
  (index) => {
    setLevels((prev) => {
      const next = prev.slice(0, index + 1);
      const key = next[next.length - 1].key;
      onLevelChange?.(key);
      lastAppliedTargetRef.current = key;
      return next;
    });
    clearHover(onNodeHover, onHoverNodeIdChange);
  },
  [onLevelChange, onNodeHover, onHoverNodeIdChange]
);

  // Build ROOT once on mount
  useEffect(() => {
    const keys = (loadFromStore?.("__keys__") || []).filter((k) => k !== "HE_2025");
    const rootEls = buildRootElements({ clusterKeys: keys });
    setLevels([
      {
        key: "ROOT",
        title: "Horizon Europe",
        graphName: "ROOT",
        elements: rootEls,
      },
    ]);
    onLevelChange?.("ROOT");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-run layout when layout *name* changes
  useEffect(() => {
    graphRef.current?.rerunLayout?.();
  }, [layoutOptions?.name]);

  const openHE = useCallback(() => {
    const raw = loadFromStore?.("HE_2025");
    const elements = raw ? buildElements(raw) : { nodeElements: [], edgeElements: [] };
    setLevels((prev) => [...prev, { key: "HE_2025", title: "Horizon Europe (SP)", graphName: "HE_2025", elements }]);
    onLevelChange?.("HE_2025");
    clearHover(onNodeHover, onHoverNodeIdChange);
  }, [loadFromStore, onLevelChange, onNodeHover, onHoverNodeIdChange]);

  const openCluster = useCallback(
    (clusterKey) => {
      const raw = loadFromStore?.(clusterKey);
      const elements = raw ? buildElements(raw) : { nodeElements: [], edgeElements: [] };
      setLevels((prev) => [
        ...prev,
        { key: clusterKey, title: clusterKey.replace(/_/g, " "), graphName: clusterKey, elements },
      ]);
      onLevelChange?.(clusterKey);
      clearHover(onNodeHover, onHoverNodeIdChange);
    },
    [loadFromStore, onLevelChange, onNodeHover, onHoverNodeIdChange]
  );

  const popLevel = useCallback(() => {
    setLevels((prev) => {
      const next = prev.length > 1 ? prev.slice(0, -1) : prev;
      const key = next[next.length - 1].key;
      onLevelChange?.(key);
      lastAppliedTargetRef.current = key;
      return next;
    });
    clearHover(onNodeHover, onHoverNodeIdChange);
  }, [onLevelChange, onNodeHover, onHoverNodeIdChange]);

  /**
   * NEW: open a Destination layer (Destination + its Calls)
   * using the current cluster Cytoscape instance.
   */
   const openDestinationLayer = useCallback(
    (cy, destinationId) => {
      if (!cy) return;

      const atKey = current?.key || "";
      if (!atKey.startsWith("Cluster_")) return;

      const dest = cy.$id(destinationId);
      if (!dest || dest.empty()) return;

      // Collect calls via HAS_CALL edges
      let callEdges = dest.outgoers('edge[type = "HAS_CALL"]').filter("edge");
      let callNodes = callEdges.targets();

      if (callNodes.length === 0) {
        const outEdges = dest.outgoers("edge");
        callNodes = outEdges.targets().filter(
          "node[type = 'Call'], node[category = 'Call']"
        );
        callEdges = outEdges.filter(
          "edge[type = 'HAS_CALL'], edge[category = 'HAS_CALL']"
        );
      }

      if (callNodes.length === 0) return;

      const destData = dest.data();
      const nodeElements = [
        { data: { ...destData }, group: "nodes" },
        ...callNodes.map((n) => ({ data: { ...n.data() }, group: "nodes" })),
      ];
      const edgeElements = callEdges.map((e) => ({
        data: { ...e.data() },
        group: "edges",
      }));

      const title =
        destData.label || destData.name || destData.id || destinationId;

      setLevels((prev) => [
        ...prev,
        {
          key: `DEST_${destData.id || destinationId}`,
          title,
          graphName: atKey, // keep cluster graphName
          elements: { nodeElements, edgeElements },
        },
      ]);

      // NEW: always clear hover when entering a destination layer
      clearHover(onNodeHover, onHoverNodeIdChange);
    },
    [current?.key, onNodeHover, onHoverNodeIdChange]
  );


  // Handlers for ROOT / clusters / destination
  const nestedHandlers = useMemo(
    () => ({
      onClusterOpen: (data) => {
        if (current?.key !== "ROOT") return;
        if (data?.type === "cluster") openCluster(data.id);
        if (data?.type === "root") openHE();
      },
      onDestinationToggle: (cy, destinationId) => {
        // Previously this toggled calls *inside* the cluster view.
        // Now it opens a dedicated destination layer.
        openDestinationLayer(cy, destinationId);
      },
      popLevel,
    }),
    [current?.key, openCluster, openHE, openDestinationLayer, popLevel]
  );

  // React when Graph Filter selects a graph (ROOT / SP / Cluster)
  useEffect(() => {
    if (!targetGraphName) return;

    const target = cleanKey(targetGraphName);
    if (target === lastAppliedTargetRef.current) return;

    const at = current?.key;
    lastAppliedTargetRef.current = target;

    if (target === "ROOT" && at !== "ROOT") {
      const keys = (loadFromStore?.("__keys__") || []).filter(
        (k) => k !== "HE_2025"
      );
      const rootEls = buildRootElements({ clusterKeys: keys });
      setLevels([
        {
          key: "ROOT",
          title: "Horizon Europe",
          graphName: "ROOT",
          elements: rootEls,
        },
      ]);
      onLevelChange?.("ROOT");
      return;
    }

    if (target === "HE_2025" && at !== "HE_2025") {
      setLevels((prev) => [{ ...prev[0] }]); // keep same root, then push SP
      openHE();
      return;
    }

    if (target !== at && target !== "ROOT") {
      setLevels((prev) => [{ ...prev[0] }]); // reset to root then push cluster
      openCluster(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetGraphName, current?.key, loadFromStore, openHE, openCluster, onLevelChange]);

  const levelBar =
    typeof renderLevelBar === "function"
      ? renderLevelBar({
          levels,
          currentKey: current.key,
          onLevelClick: handleLevelClick,
          canGoBack: levels.length > 1,
          onBack: popLevel,
        })
      : null;

  return (
    <div className="graph-main-inner">
      {levelBar}
      <div className="graph-canvas-wrapper">
        <GraphView
          ref={graphRef}
          graphData={current.elements}
          graphName={current.graphName}
          layoutOptions={layoutOptions}
          onCyReady={(cy) => {
            // Hide Calls only on *cluster* layers (not ROOT, not destination layers)
            const key = current.key || "";
            if (key.startsWith("Cluster_")) {
              cy.nodes("[type = 'Call'], [category = 'Call']").addClass(
                "call-hidden"
              );
            }
            onCyReady?.(cy);
          }}
          onNodeHover={onNodeHover}
          onHoverNodeIdChange={onHoverNodeIdChange}
          nestedHandlers={nestedHandlers}
        />
      </div>
    </div>
  );
}
