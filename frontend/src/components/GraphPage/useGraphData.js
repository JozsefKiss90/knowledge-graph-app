// src/components/GraphPage/useGraphData.js
import { useCallback, useEffect, useRef, useState } from "react";
import { buildElements } from "../utils/buildElements";

const API_BASE = process.env.REACT_APP_API_URL;
 
export const GRAPH_ENDPOINTS = {
  // Strategic Plan (isolated)
  HE_2025: { nodes: "/nodes/", rels: "/relationships/" },

  // Pillar II – clusters
  Cluster_1: { nodes: "/cluster1/nodes", rels: "/cluster1/relationships" },
  Cluster_2: { nodes: "/cluster2/nodes", rels: "/cluster2/relationships" },
  Cluster_3: { nodes: "/cluster3/nodes", rels: "/cluster3/relationships" },
  Cluster_4: { nodes: "/cluster4/nodes", rels: "/cluster4/relationships" },
  Cluster_5: { nodes: "/cluster5/nodes", rels: "/cluster5/relationships" },
  Cluster_6: { nodes: "/cluster6/nodes", rels: "/cluster6/relationships" },

  // Pillar I – Excellent Science
  ERC: { nodes: "/erc/nodes", rels: "/erc/relationships" },
  MSCA: { nodes: "/msca/nodes", rels: "/msca/relationships" },
  INFRA: { nodes: "/infra/nodes", rels: "/infra/relationships" },

  // Pillar II – Missions
  MISS: { nodes: "/missions/nodes", rels: "/missions/relationships" },

  // Pillar III – Innovative Europe
  EIC: { nodes: "/eic/nodes", rels: "/eic/relationships" },
  EIE: { nodes: "/eie/nodes", rels: "/eie/relationships" },
  // EIT: { nodes: "/eit/nodes", rels: "/eit/relationships" },

  // Cross-pillar / horizontal
  WIDERA: { nodes: "/widera/nodes", rels: "/widera/relationships" },

  // Standalone programmes (no pillars)
  DEP: { nodes: "/dep/nodes", rels: "/dep/relationships" },
  ERASMUS: { nodes: "/erasmus/nodes", rels: "/erasmus/relationships" },

  // ✅ New standalone programmes
  CEF: { nodes: "/cef/nodes", rels: "/cef/relationships" },
  CREA: { nodes: "/crea/nodes", rels: "/crea/relationships" },
  EURATOM: { nodes: "/euratom/nodes", rels: "/euratom/relationships" },
};

// ---- helper: derive a cluster subgraph client-side from HE_2025 raw (kept for backwards compatibility)
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
  const [progress, setProgress] = useState(0);
  const storeRef = useRef(new Map());
  const heRef = useRef(null);

  const [graphName, setGraphNameState] = useState(
    () => localStorage.getItem("graphName") || "ROOT"
  );

  useEffect(() => {
    let cancelled = false;

    async function preloadAll() {
      setReady(false);

      // 1) Load HE_2025 first (best-effort)
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
        console.error("Failed to preload HE_2025; HE-derived fallback will be empty.", e);
        heRef.current = null;
      }

      // 2) Preload every other dataset. If missing, store null and keep going.
      const entries = Object.entries(GRAPH_ENDPOINTS).filter(([k]) => k !== "HE_2025");
      const total = entries.length + 1; // +1 for HE_2025
      let loaded = 1; // HE_2025 already done
      if (!cancelled) setProgress(Math.round((loaded / total) * 100));

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
          console.warn(`Endpoint missing for ${key}; dataset will be unavailable until backend is ready.`);
        }
        loaded++;
        if (!cancelled) setProgress(Math.round((loaded / total) * 100));
      }

      if (!cancelled) setReady(true);
    }

    preloadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const setGraphName = useCallback((name) => {
    localStorage.setItem("graphName", name);
    setGraphNameState(name);
  }, []);

  const loadFromStore = useCallback((key) => {
    if (key === "__keys__") {
      return Object.keys(GRAPH_ENDPOINTS).filter((k) => k !== "HE_2025");
    }

    const raw = storeRef.current.get(key);
    if (raw) return raw;

    if (raw === null && heRef.current && /^Cluster_\d+$/i.test(String(key))) {
      const derived = deriveClusterRawFromHE(heRef.current, key);
      if (derived) {
        storeRef.current.set(key, derived);
        return derived;
      }
    }

    return null;
  }, []);

  return { ready, progress, graphName, setGraphName, storeRef, loadFromStore };
}
