// NestedGraphController.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GraphView from "./GraphView";
import { buildElements } from "./utils/buildElements";
import CLUSTERS from "./utils/heClusterSummaries.json";

function cleanGraphName(name) {
  return String(name || "").replace(/_cose$/i, "");
}

function resolveClusterTitle(clusterKey) {
  const key = cleanGraphName(clusterKey);
  const meta = CLUSTERS?.[key] || CLUSTERS?.[clusterKey];
  return meta?.title || meta?.name || meta?.label || key.replace(/_/g, " ");
}

const PILLARS = [
  { id: "P1", title: "Pillar I: Excellent Science" },
  { id: "P2", title: "Pillar II: Global Challenges & European Industrial Competitiveness" },
  { id: "P3", title: "Pillar III: Innovative Europe" },
  { id: "WIDERA", title: "Widening Participation & Strengthening the ERA (WIDERA)" },
];

const PROGRAMMES_BY_PILLAR = {
  P1: [
    { key: "ERC", title: "ERC" },
    { key: "MSCA", title: "MSCA" },
    { key: "INFRA", title: "Research Infrastructures (INFRA)" },
  ],
  P2: [
    { key: "Cluster_1", title: "CL1 / HLTH (Health)" },
    { key: "Cluster_2", title: "CL2 (Culture, Creativity & Inclusive Society)" },
    { key: "Cluster_3", title: "CL3 (Civil Security for Society)" },
    { key: "Cluster_4", title: "CL4 (Digital, Industry & Space)" },
    { key: "Cluster_5", title: "CL5 (Climate, Energy & Mobility)" },
    { key: "Cluster_6", title: "CL6 (Food, Bioeconomy, Natural Resources, Agriculture & Environment)" },
    { key: "MISS", title: "Missions (MISS)" },
  ],
  P3: [
    { key: "EIC", title: "EIC" },
    { key: "EIE", title: "EIE" },
  ],
  WIDERA: [],
};

function clearHover(onNodeHover, onHoverNodeIdChange) {
  onNodeHover?.(null);
  onHoverNodeIdChange?.(null);
}

function isPillarKey(k) {
  return /^PILLAR_[A-Z0-9]+$/i.test(String(k || ""));
}
function pillarIdFromKey(k) {
  const m = String(k || "").match(/^PILLAR_([A-Z0-9]+)$/i);
  return m ? m[1] : null;
}
function cleanKey(k) {
  return (k || "").replace("_cose", "");
}

function outboundLevelKey(level) {
  if (!level) return "ROOT";

  const key = String(level.key || "");
  if (key.startsWith("DEST_")) {
    return level.graphName || "ROOT";
  }

  return key || level.graphName || "ROOT";
}
/**
 * SUPER ROOT: Horizon Europe + standalone programmes
 */
function buildSuperRootElements({ available }) {
  const centerId = "ROOT_EU";

  const nodes = [
    { data: { id: centerId, label: "EU Funding Programmes", type: "root" }, group: "nodes" },

    // HE entry point (synthetic navigation)
    { data: { id: "PROG_HE_ROOT", label: "Horizon Europe", type: "programme", programmeKey: "HE_ROOT" }, group: "nodes" },
  ];

  const maybeAdd = (key, label) => {
    if (!available.has(key)) return;
    nodes.push({
      data: { id: `PROG_${key}`, label, type: "programme", programmeKey: key },
      group: "nodes",
    });
  };

  maybeAdd("DEP", "Digital Europe");
  maybeAdd("ERASMUS", "Erasmus+");

  // ✅ New ones
  maybeAdd("CEF", "Connecting Europe Facility (CEF)");
  maybeAdd("CREA", "Creative Europe (CREA)");
  maybeAdd("EURATOM", "EURATOM");

  const edges = nodes
    .filter((n) => n.data.id !== centerId)
    .map((n) => ({
      data: { id: `${centerId}-${n.data.id}`, source: centerId, target: n.data.id, type: "HAS_PROGRAMME" },
      group: "edges",
    }));

  return { nodeElements: nodes, edgeElements: edges };
}

function buildHERootElements() {
  const centerId = "ROOT_HE";

  const pillarNodes = PILLARS.map((p) => ({
    data: { id: `PILLAR_${p.id}`, label: p.title, type: "pillar" },
    group: "nodes",
  }));

  const nodes = [
    { data: { id: centerId, label: "Horizon Europe", type: "root" }, group: "nodes" },
    ...pillarNodes,
  ];

  const edges = PILLARS.map((p) => ({
    data: { id: `${centerId}-PILLAR_${p.id}`, source: centerId, target: `PILLAR_${p.id}`, type: "BELONGS_TO" },
    group: "edges",
  }));

  return { nodeElements: nodes, edgeElements: edges };
}

function buildPillarElements({ pillarId, availableProgrammeKeys }) {
  const pillar = PILLARS.find((p) => p.id === pillarId);
  const pillarNodeId = `PILLAR_${pillarId}`;
  const centreId = pillarNodeId;

  const programmeDefs = PROGRAMMES_BY_PILLAR[pillarId] || [];
  const programmeNodes = programmeDefs
    .filter((p) => availableProgrammeKeys.has(p.key))
    .map((p) => {
      const isCluster = /^Cluster_\d+$/i.test(p.key);
      return {
        data: {
          id: `PROG_${p.key}`,
          programmeKey: p.key,
          label: isCluster ? resolveClusterTitle(p.key) : p.title,
          type: "programme",
          kind: isCluster ? "cluster" : "programme",
        },
        group: "nodes",
      };
    });

  const nodes = [
    { data: { id: centreId, label: pillar?.title || pillarId, type: "pillar" }, group: "nodes" },
    ...programmeNodes,
  ];

  const edges = programmeNodes.map((n) => ({
    data: { id: `${centreId}-${n.data.id}`, source: centreId, target: n.data.id, type: "HAS_PROGRAMME" },
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
  loadFromStore,
  onLevelChange,
  targetGraphName,
  renderLevelBar,
  onOpenDetail,
  onCompareSelect,
}) {
  const graphRef = useRef(null);

  const [levels, setLevels] = useState(() => [
    { key: initialGraphName, title: "EU Funding Programmes", graphName: initialGraphName, elements: { nodeElements: [], edgeElements: [] } },
  ]);

  const current = levels[levels.length - 1];
  const lastAppliedTargetRef = useRef(initialGraphName);

  const availableDatasetKeys = useMemo(() => {
    const keys = loadFromStore?.("__keys__") || [];
    return new Set(keys);
  }, [loadFromStore]);

  const handleLevelClick = useCallback(
    (index) => {
      const next = levels.slice(0, index + 1);
      const key = next[next.length - 1]?.key;

      setLevels(next);

      const activeLevel = next[next.length - 1];
      const outboundKey = outboundLevelKey(activeLevel);

      if (outboundKey) {
        lastAppliedTargetRef.current = outboundKey;
        onLevelChange?.(outboundKey);
      }
      clearHover(onNodeHover, onHoverNodeIdChange);
    },
    [levels, onLevelChange, onNodeHover, onHoverNodeIdChange]
  );

  useEffect(() => {
    const rootEls = buildSuperRootElements({ available: availableDatasetKeys });
    setLevels([{ key: "ROOT", title: "EU Funding Programmes", graphName: "ROOT", elements: rootEls }]);
    lastAppliedTargetRef.current = "ROOT";
    onLevelChange?.("ROOT");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDatasetKeys.size]);

  useEffect(() => {
    graphRef.current?.rerunLayout?.();
  }, [layoutOptions?.name]);

  const openHERoot = useCallback(() => {
    const els = buildHERootElements();
    setLevels((prev) => [...prev, { key: "HE_ROOT", title: "Horizon Europe", graphName: "HE_ROOT", elements: els }]);
    lastAppliedTargetRef.current = "HE_ROOT";
    onLevelChange?.("HE_ROOT");
    clearHover(onNodeHover, onHoverNodeIdChange);
  }, [onLevelChange, onNodeHover, onHoverNodeIdChange]);

  const openHE = useCallback(() => {
    const raw = loadFromStore?.("HE_2025");
    const elements = raw ? buildElements(raw) : { nodeElements: [], edgeElements: [] };
    setLevels((prev) => [...prev, { key: "HE_2025", title: "Horizon Europe (SP)", graphName: "HE_2025", elements }]);
    lastAppliedTargetRef.current = "HE_2025";
    onLevelChange?.("HE_2025");
    clearHover(onNodeHover, onHoverNodeIdChange);
  }, [loadFromStore, onLevelChange, onNodeHover, onHoverNodeIdChange]);

  const openPillar = useCallback(
    (pillarId) => {
      const els = buildPillarElements({ pillarId, availableProgrammeKeys: availableDatasetKeys });
      const title = PILLARS.find((p) => p.id === pillarId)?.title || `Pillar ${pillarId}`;
      const key = `PILLAR_${pillarId}`;

      setLevels((prev) => [...prev, { key, title, graphName: "HE_ROOT", elements: els }]);
      lastAppliedTargetRef.current = key;
      onLevelChange?.(key);
      clearHover(onNodeHover, onHoverNodeIdChange);
    },
    [availableDatasetKeys, onLevelChange, onNodeHover, onHoverNodeIdChange]
  );

  const openProgramme = useCallback(
    (programmeKey) => {
      if (programmeKey === "HE_ROOT") {
        openHERoot();
        return;
      }

      const raw = loadFromStore?.(programmeKey);
      const elements = raw ? buildElements(raw) : { nodeElements: [], edgeElements: [] };

      setLevels((prev) => [...prev, { key: programmeKey, title: programmeKey, graphName: programmeKey, elements }]);
      lastAppliedTargetRef.current = programmeKey;
      onLevelChange?.(programmeKey);
      clearHover(onNodeHover, onHoverNodeIdChange);
    },
    [loadFromStore, onLevelChange, onNodeHover, onHoverNodeIdChange, openHERoot]
  );

  const popLevel = useCallback(() => {
    setLevels((prev) => {
      const next = prev.length > 1 ? prev.slice(0, -1) : prev;
      const activeLevel = next[next.length - 1];
      const outboundKey = outboundLevelKey(activeLevel);

      queueMicrotask(() => {
        if (outboundKey) {
          lastAppliedTargetRef.current = outboundKey;
          onLevelChange?.(outboundKey);
        }
      });
      return next;
    });
    clearHover(onNodeHover, onHoverNodeIdChange);
  }, [onLevelChange, onNodeHover, onHoverNodeIdChange]);

  const openDestinationLayer = useCallback(
    (_cy, destinationId) => {
      const atKey = current?.key || "";
      if (!atKey || atKey === "ROOT" || atKey === "HE_ROOT" || atKey === "HE_2025" || isPillarKey(atKey)) return;

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

      const isRealCallNode = (d) => {
        const type = String(d?.type || d?.category || "");
        if (type !== "Call") return false;

        const id = String(d?.id || "");
        const label = String(d?.label || d?.name || "");

        // ✅ guard against synthetic/meta nodes leaking into call layer
        if (!id) return false;
        if (/^PILLAR_/i.test(id)) return false;
        if (/^PROG_/i.test(id)) return false;
        if (/^HE(_|$)/i.test(id)) return false;
        if (/horizon\s*europe/i.test(label)) return false;
        if (id === "WIDERA") return false;

        return true;
      };

      const callNodes = allNodes.filter((n) => {
        const d = n?.data || {};
        return callIdSet.has(d.id) && isRealCallNode(d);
      });
      if (callNodes.length === 0) return;

      const title = destEl.data.label || destEl.data.name || destEl.data.id || destinationId;
      const destKey = `DEST_${destEl.data.id || destinationId}`;

      setLevels((prev) => [
        ...prev,
        { key: destKey, title, graphName: atKey, elements: { nodeElements: [destEl, ...callNodes], edgeElements: callEdges } },
      ]);

      lastAppliedTargetRef.current = atKey;
      onLevelChange?.(atKey);
      clearHover(onNodeHover, onHoverNodeIdChange);
    },
    [current?.key, loadFromStore, onNodeHover, onHoverNodeIdChange, onLevelChange]
  );

  const nestedHandlers = useMemo(
    () => ({
      onClusterOpen: (data) => {
        const atKey = current?.key || "";
        const isNavLayer = atKey === "ROOT" || atKey === "HE_ROOT" || isPillarKey(atKey);
        if (!isNavLayer) return;

        if (data?.type === "root") {
          if (atKey === "HE_ROOT") openHE();
          return;
        }

        if (data?.type === "programme") {
          const programmeKey = data?.programmeKey || String(data?.id || "").replace(/^PROG_/, "");
          if (programmeKey) openProgramme(programmeKey);
          return;
        }
        if (data?.type === "pillar") {
        const pid = pillarIdFromKey(data.id);
        if (!pid) return;

        // Prevent recursive re-opening of the same pillar level (breadcrumb explosion)
        if (current?.key === `PILLAR_${pid}`) return;

        // WIDERA is special: it should behave like a programme entry (go straight to calls)
        if (pid === "WIDERA") {
          openProgramme("WIDERA");
          return;
        }

        openPillar(pid);
          return;
        }
      },
      onDestinationToggle: (cy, destinationId) => openDestinationLayer(cy, destinationId),
      popLevel,
    }),
    [current?.key, openHE, openProgramme, openPillar, openDestinationLayer, popLevel]
  );

  useEffect(() => {
    if (!targetGraphName) return;

    const target = cleanKey(targetGraphName);
    if (String(target).startsWith("DEST_")) {
      return;
    }
    if (target === current?.key) {
      lastAppliedTargetRef.current = target;
      return;
    }
    if (target === lastAppliedTargetRef.current) return;

    lastAppliedTargetRef.current = target;

    if (target === "ROOT") {
      const els = buildSuperRootElements({ available: availableDatasetKeys });
      setLevels([{ key: "ROOT", title: "EU Funding Programmes", graphName: "ROOT", elements: els }]);
      onLevelChange?.("ROOT");
      return;
    }

    if (target === "HE_ROOT") {
      setLevels((prev) => [{ ...prev[0] }]);
      openHERoot();
      return;
    }

    if (target === "HE_2025") {
      setLevels((prev) => [{ ...prev[0] }]);
      openHERoot();
      queueMicrotask(() => openHE());
      return;
    }

    if (isPillarKey(target)) {
      const pid = pillarIdFromKey(target);
      if (!pid) return;
      setLevels((prev) => [{ ...prev[0] }]);
      openHERoot();
      queueMicrotask(() => openPillar(pid));
      return;
    }

    setLevels((prev) => [{ ...prev[0] }]);
    openProgramme(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetGraphName, current?.key, availableDatasetKeys.size, onLevelChange, openHERoot, openHE, openProgramme, openPillar]);

  const levelBar =
    typeof renderLevelBar === "function"
      ? renderLevelBar({ levels, currentKey: current.key, onLevelClick: handleLevelClick, canGoBack: levels.length > 1, onBack: popLevel })
      : null;

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
            const isDatasetOverview =
              key !== "ROOT" && key !== "HE_2025" && !isPillarKey(key) && !key.startsWith("DEST_") && key !== "WIDERA"
            if (isDatasetOverview) {
              cy.nodes("[type = 'Call'], [category = 'Call']").addClass("call-hidden");
            }
            onCyReady?.(cy);
          }}
          onNodeHover={onNodeHover}
          onHoverNodeIdChange={onHoverNodeIdChange}
          nestedHandlers={nestedHandlers}
          onOpenDetail={onOpenDetail}
          onCompareSelect={onCompareSelect}
        />
      </div>
    </div>
  );
}
