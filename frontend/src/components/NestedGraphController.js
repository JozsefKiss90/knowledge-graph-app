// NestedGraphController.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GraphView from "./GraphView";
import { buildElements } from "./utils/buildElements";

  const HE_CLUSTER_NAMES = {
    Cluster_1: "Cluster 1: Health",
    Cluster_2: "Cluster 2: Culture, Creativity and Inclusive Society",
    Cluster_3: "Cluster 3: Civil Security for Society",
    Cluster_4: "Cluster 4: Digital, Industry and Space",
    Cluster_5: "Cluster 5: Climate, Energy and Mobility",
    Cluster_6: "Cluster 6: Food, Bioeconomy, Natural Resources, Agriculture and Environment",
  };

  const cleanKey = (k) => String(k || "").replace(/_cose$/i, "");

  const clusterDisplayName = (key) => {
    const k = cleanKey(key);
    return HE_CLUSTER_NAMES[k] || k.replace(/_/g, " ");
  };
/** Synthetic ROOT graph */
function buildRootElements({ clusterKeys }) {
  const centerId = "ROOT_HE";

  const nodes = [
    {
      data: { id: centerId, label: "Horizon Europe", type: "root" },
      group: "nodes",
    },
    ...clusterKeys.map((k) => ({
      data: { id: k, label: clusterDisplayName(k), type: "cluster" },
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
      // Compute key first from current state (no state updates yet)
      const next = levels.slice(0, index + 1);
      const key = next[next.length - 1]?.key;

      setLevels(next);

      if (key) {
        onLevelChange?.(key);
        lastAppliedTargetRef.current = key;
      }

      clearHover(onNodeHover, onHoverNodeIdChange);
    },
    [levels, onLevelChange, onNodeHover, onHoverNodeIdChange]
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
    setLevels((prev) => [
      ...prev,
      { key: "HE_2025", title: "Horizon Europe (SP)", graphName: "HE_2025", elements },
    ]);
    onLevelChange?.("HE_2025");
    clearHover(onNodeHover, onHoverNodeIdChange);
  }, [loadFromStore, onLevelChange, onNodeHover, onHoverNodeIdChange]);

  const openCluster = useCallback(
    (clusterKey) => {
      const raw = loadFromStore?.(clusterKey);
      const title = clusterDisplayName(clusterKey);

      const elements = raw ? buildElements(raw) : { nodeElements: [], edgeElements: [] };

      // patch cluster root node label inside the cluster graph
      const patchedNodes = (elements.nodeElements || []).map((el) => {
        const d = el?.data || {};
        if (String(d.id) === String(clusterKey)) {
          return { ...el, data: { ...d, label: title, fullLabel: title } };
        }
        return el;
      });

      setLevels((prev) => [
        ...prev,
        { key: clusterKey, title, graphName: clusterKey, elements: { ...elements, nodeElements: patchedNodes } },
      ]);

      onLevelChange?.(clusterKey);
      clearHover(onNodeHover, onHoverNodeIdChange);
    },
    [loadFromStore, onLevelChange, onNodeHover, onHoverNodeIdChange]
  );

  const popLevel = useCallback(() => {
    // Compute next + key without using a functional updater (avoids “setState during render”)
    setLevels((prev) => {
      const next = prev.length > 1 ? prev.slice(0, -1) : prev;
      const key = next[next.length - 1]?.key;

      // Defer parent updates to microtask so it’s never during render
      queueMicrotask(() => {
        if (key) {
          onLevelChange?.(key);
          lastAppliedTargetRef.current = key;
        }
      });

      return next;
    });

    clearHover(onNodeHover, onHoverNodeIdChange);
  }, [onLevelChange, onNodeHover, onHoverNodeIdChange]);

  const openDestinationLayer = useCallback(
    (_cy, destinationId) => {
      const atKey = current?.key || "";
      if (!atKey.startsWith("Cluster_")) return;

      const raw = loadFromStore?.(atKey);
      if (!raw) return;

      const full = buildElements(raw);
      const allNodes = full?.nodeElements || [];
      const allEdges = full?.edgeElements || [];

      const destEl = allNodes.find((n) => n?.data?.id === destinationId);
      if (!destEl) return;

      const callEdges = allEdges.filter((e) => {
        const d = e?.data || {};
        const isHasCall = d.type === "HAS_CALL" || d.category === "HAS_CALL";
        return isHasCall && d.source === destinationId;
      });

      const callIdSet = new Set(callEdges.map((e) => e?.data?.target).filter(Boolean));

      const callNodes = allNodes.filter((n) => {
        const d = n?.data || {};
        const isCall = d.type === "Call" || d.category === "Call";
        return isCall && callIdSet.has(d.id);
      });

      if (callNodes.length === 0) return;

      const title = destEl.data.label ||  destEl.data.name || destEl.data.id || destinationId;
      const destKey = `DEST_${destEl.data.id || destinationId}`;

      setLevels((prev) => [
        ...prev,
        {
          key: destKey,
          title,
          // keep dataset identity for the layer so GraphSelector still makes sense
          graphName: atKey,
          elements: { nodeElements: [destEl, ...callNodes], edgeElements: callEdges },
        },
      ]);
      onLevelChange?.(destKey);
      lastAppliedTargetRef.current = destKey;
      
      clearHover(onNodeHover, onHoverNodeIdChange);
    },
    [current?.key, loadFromStore, onNodeHover, onHoverNodeIdChange]
  );

  // Handlers for ROOT / clusters / destination
  const nestedHandlers = useMemo(
    () => ({
      onClusterOpen: (data) => {
        if (current?.key !== "ROOT") return;
        if (data?.type === "cluster") openCluster(data.id);
        if (data?.type === "root") openHE();
      },
      onDestinationToggle: (cy, destinationId) => openDestinationLayer(cy, destinationId),
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
      const keys = (loadFromStore?.("__keys__") || []).filter((k) => k !== "HE_2025");
      const rootEls = buildRootElements({ clusterKeys: keys });
      setLevels([{ key: "ROOT", title: "Horizon Europe", graphName: "ROOT", elements: rootEls }]);
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
    console.log( "layerkey",current?.key );    
  return (
    <div className="graph-main-inner">
      {levelBar}
      <div className="graph-canvas-wrapper">
        <GraphView
          key={current.key}
          ref={graphRef}
          graphData={current.elements}
          graphName={current.graphName}
          layerKey={current.key}
          layoutOptions={layoutOptions}
          onCyReady={(cy) => {
            // Safety: if any Call nodes exist in cluster overview, hide them
            const key = current.key || "";
            if (key.startsWith("Cluster_")) {
              cy.nodes("[type = 'Call'], [category = 'Call']").addClass("call-hidden");
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
