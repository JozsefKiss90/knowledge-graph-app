// NestedGraphController.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GraphView from "./GraphView";
import { buildElements } from "./utils/buildElements";
import CLUSTERS from "./utils/heClusterSummaries.json"; // adjust path if needed

function cleanGraphName(name) {
  return String(name || "").replace(/_cose$/i, "");
}

function resolveClusterTitle(clusterKey) {
  const key = cleanGraphName(clusterKey);

  // Expecting heClusterSummaries.json entries like:
  // { "Cluster_3": { "title": "Cluster 3: Civil Security for Society", ... }, ... }
  const meta = CLUSTERS?.[key] || CLUSTERS?.[clusterKey];

  return (
    meta?.title ||
    meta?.name ||
    meta?.label ||
    // fallback: at least produce "Cluster 3" instead of "Cluster 3" with underscores
    key.replace(/_/g, " ")
  );
}

function buildRootElements({ clusterKeys }) {
  const centerId = "ROOT_HE";

  const nodes = [
    {
      data: { id: centerId, label: "Horizon Europe", type: "root" },
      group: "nodes",
    },
    ...clusterKeys.map((k) => ({
      data: {
        id: k,
        label: resolveClusterTitle(k), // <- FULL TITLE HERE
        type: "cluster",
      },
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
  // NEW: inline detail handler from GraphMainColumn
  onOpenDetail,
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
      const elements = raw ? buildElements(raw) : { nodeElements: [], edgeElements: [] };
      setLevels((prev) => [
        ...prev,
        {
          key: clusterKey,
          title: clusterKey.replace(/_/g, " "),
          graphName: clusterKey,
          elements,
        },
      ]);
      onLevelChange?.(clusterKey);
      clearHover(onNodeHover, onHoverNodeIdChange);
    },
    [loadFromStore, onLevelChange, onNodeHover, onHoverNodeIdChange]
  );

  const popLevel = useCallback(() => {
    setLevels((prev) => {
      const next = prev.length > 1 ? prev.slice(0, -1) : prev;
      const key = next[next.length - 1]?.key;

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

      const title =
        destEl.data.label || destEl.data.name || destEl.data.id || destinationId;
      const destKey = `DEST_${destEl.data.id || destinationId}`;

      setLevels((prev) => [
        ...prev,
        {
          key: destKey,
          title,
          graphName: atKey,
          elements: { nodeElements: [destEl, ...callNodes], edgeElements: callEdges },
        },
      ]);
      onLevelChange?.(destKey);
      lastAppliedTargetRef.current = destKey;

      clearHover(onNodeHover, onHoverNodeIdChange);
    },
    [current?.key, loadFromStore, onNodeHover, onHoverNodeIdChange, onLevelChange]
  );

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

  useEffect(() => {
    if (!targetGraphName) return;

    const target = cleanKey(targetGraphName);
    if (target === lastAppliedTargetRef.current) return;

    const at = current?.key;
    lastAppliedTargetRef.current = target;

    if (target === "ROOT" && at !== "ROOT") {
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
      return;
    }

    if (target === "HE_2025" && at !== "HE_2025") {
      setLevels((prev) => [{ ...prev[0] }]);
      openHE();
      return;
    }

    if (target !== at && target !== "ROOT") {
      setLevels((prev) => [{ ...prev[0] }]);
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

  console.log("layerkey", current?.key);
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
            const key = current.key || "";
            if (key.startsWith("Cluster_")) {
              cy.nodes("[type = 'Call'], [category = 'Call']").addClass("call-hidden");
            }
            onCyReady?.(cy);
          }}
          onNodeHover={onNodeHover}
          onHoverNodeIdChange={onHoverNodeIdChange}
          nestedHandlers={nestedHandlers}
          // NEW: forward inline detail handler to GraphView/setupEvents
          onOpenDetail={onOpenDetail}
        />
      </div>
    </div>
  );
}
