// src/components/GraphPage/useGraphData.js
import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL;
 
export const GRAPH_ENDPOINTS = {
  // HE Wiki knowledge graph
  HE_2025: { nodes: "/hewiki/nodes", rels: "/hewiki/relationships" },

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

export function useGraphData() {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const storeRef = useRef(new Map());

  const [graphName, setGraphNameState] = useState(
    () => localStorage.getItem("graphName") || "ROOT"
  );

  useEffect(() => {
    let cancelled = false;

    async function preloadAll() {
      setReady(false);

      const entries = Object.entries(GRAPH_ENDPOINTS);
      const total = entries.length;
      let loaded = 0;

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

    return storeRef.current.get(key) || null;
  }, []);

  return { ready, progress, graphName, setGraphName, storeRef, loadFromStore };
}
