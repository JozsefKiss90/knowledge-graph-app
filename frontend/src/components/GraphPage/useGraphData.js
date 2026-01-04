// src/components/GraphPage/useGraphData.js
import { useCallback, useEffect, useRef, useState } from "react";
import { buildElements } from "../utils/buildElements"; // for safe shapes

const API_BASE = process.env.REACT_APP_API_URL;

// All datasets we want to use
export const GRAPH_ENDPOINTS = {
  HE_2025: { nodes: "/nodes/", rels: "/relationships/" },           // Strategic Plan (isolated)
  Cluster_2: { nodes: "/cluster2/nodes", rels: "/cluster2/relationships" },
  Cluster_3: { nodes: "/cluster3/nodes", rels: "/cluster3/relationships" },
  Cluster_4: { nodes: "/cluster4/nodes", rels: "/cluster4/relationships" },
  Cluster_5: { nodes: "/cluster5/nodes", rels: "/cluster5/relationships" },
  Cluster_1: { nodes: "/cluster1/nodes", rels: "/cluster1/relationships" },
  Cluster_6: { nodes: "/cluster6/nodes", rels: "/cluster6/relationships" },
};

// ---- helper: derive a cluster subgraph client-side from HE_2025 raw
function deriveClusterRawFromHE(heRaw, clusterKey) {
  if (!heRaw?.nodes || !heRaw?.rels) return null;

  const { nodeElements, edgeElements } = buildElements(heRaw);

  const keepIds = new Set(
    nodeElements
      .map((n) => n.data)
      .filter((d) => d.cluster === clusterKey || d.id === clusterKey)
      .map((d) => d.id)
  );

  edgeElements.forEach((e) => {
    if (keepIds.has(e.data.source) || keepIds.has(e.data.target)) {
      keepIds.add(e.data.source);
      keepIds.add(e.data.target);
    }
  });

  const rawNodes = nodeElements
    .filter((n) => keepIds.has(n.data.id))
    .map((n) => {
      const d = n.data;
      return { id: d.id, name: d.label || d.name || d.displayLabel || d.id, ...d };
    });

  const rawRels = edgeElements
    .filter((e) => keepIds.has(e.data.source) && keepIds.has(e.data.target))
    .map((e) => ({
      id: e.data.id,
      source: e.data.source,
      target: e.data.target,
      type: e.data.type || e.data.label || "RELATED",
      label: e.data.label || e.data.type || "RELATED",
    }));

  return { nodes: rawNodes, rels: { relationships: rawRels } };
}

export function useGraphData() {
  const [ready, setReady] = useState(false);
  const storeRef = useRef(new Map()); // key -> { nodes, rels }
  const heRef = useRef(null);
  const [graphName, setGraphNameState] = useState(
    () => localStorage.getItem("graphName") || "ROOT"
  );

  useEffect(() => {
    let cancelled = false;

    async function preloadAll() {
      setReady(false);

      // 1) Load HE_2025 first
      try {
        const ep = GRAPH_ENDPOINTS.HE_2025;
        const [nr, rr] = await Promise.all([
          fetch(`${API_BASE}${ep.nodes}`),
          fetch(`${API_BASE}${ep.rels}`),
        ]);
        const [nodes, rels] = await Promise.all([nr.json(), rr.json()]);
        heRef.current = { nodes, rels };
        storeRef.current.set("HE_2025", heRef.current);
      } catch (e) {
        console.error("Failed to preload HE_2025; cluster derivation will be empty.", e);
        heRef.current = null;
      }

      // 2) Try each cluster endpoint; if it fails, mark as derived-from-HE (lazy)
      const entries = Object.entries(GRAPH_ENDPOINTS).filter(([k]) => k !== "HE_2025");
      for (const [key, ep] of entries) {
        try {
          const [nr, rr] = await Promise.all([
            fetch(`${API_BASE}${ep.nodes}`),
            fetch(`${API_BASE}${ep.rels}`),
          ]);
          if (!nr.ok || !rr.ok) throw new Error(`Fetch failed for ${key}`);
          const [nodes, rels] = await Promise.all([nr.json(), rr.json()]);
          storeRef.current.set(key, { nodes, rels });
        } catch (e) {
          storeRef.current.set(key, null);
          console.warn(`Cluster endpoint missing for ${key}; will derive from HE_2025 when opened.`);
        }
      }

      if (!cancelled) setReady(true);
    }

    preloadAll();
    return () => { cancelled = true; };
  }, []);

  // ✅ Stable setter (prevents downstream effects from re-running every render)
  const setGraphName = useCallback((name) => {
    localStorage.setItem("graphName", name);
    setGraphNameState(name);
  }, []);

  // ✅ Stable accessor (CRITICAL: prevents GraphPage hover hydration effect from restarting)
  const loadFromStore = useCallback((key) => {
    if (key === "__keys__") {
      return Object.keys(GRAPH_ENDPOINTS).filter((k) => k !== "HE_2025");
    }

    const raw = storeRef.current.get(key);
    if (raw) return raw;

    if (raw === null && heRef.current) {
      const derived = deriveClusterRawFromHE(heRef.current, key);
      if (derived) {
        storeRef.current.set(key, derived);
        return derived;
      }
    }

    return null;
  }, []);

  return {
    ready,
    graphName,
    setGraphName,
    storeRef,
    loadFromStore,
  };
}
