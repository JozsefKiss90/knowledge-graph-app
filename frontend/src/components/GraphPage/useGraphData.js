// src/components/GraphPage/useGraphData.js
import { useEffect, useRef, useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL;

const GRAPH_ENDPOINTS = {
  HE_2025: { nodes: "/nodes/", rels: "/relationships/" },
  Cluster_2: { nodes: "/cluster2/nodes", rels: "/cluster2/relationships" },
  Cluster_3: { nodes: "/cluster3/nodes", rels: "/cluster3/relationships" },
  Cluster_4: { nodes: "/cluster4/nodes", rels: "/cluster4/relationships" },
  Cluster_5: { nodes: "/cluster5/nodes", rels: "/cluster5/relationships" },
  Cluster_1_2026: { nodes: "/cluster1/nodes", rels: "/cluster1/relationships" },
  Cluster_6_2026: { nodes: "/cluster6/nodes", rels: "/cluster6/relationships" },
};

export function useGraphData() {
  const [graphName, setGraphName] = useState(() => localStorage.getItem("graphName") || "HE_2025");
  const [ready, setReady] = useState(false);
  const graphDataRef = useRef(null);

  const handleGraphNameChange = (name) => {
    localStorage.setItem("graphName", name);
    setGraphName(name);
  };

  useEffect(() => {
    const savedGraphName = localStorage.getItem("graphName");
    if (savedGraphName && savedGraphName !== graphName) {
      setGraphName(savedGraphName);
    }
  }, []); // run once on mount

  useEffect(() => {
    const fetchGraph = async () => {
      const baseName = graphName.replace("_cose", "");
      const endpoint = GRAPH_ENDPOINTS[baseName];

      if (!endpoint) {
        console.warn(`No API endpoint configured for graph "${baseName}".`);
        return;
      }

      try {
        const nodesUrl = `${API_BASE}${endpoint.nodes}`;
        const relsUrl = `${API_BASE}${endpoint.rels}`;

        const [nodesRes, relsRes] = await Promise.all([
          fetch(nodesUrl),
          fetch(relsUrl),
        ]);

        if (!nodesRes.ok || !relsRes.ok) {
          throw new Error(`Fetch failed for ${baseName}: ${nodesRes.status}/${relsRes.status}`);
        }

        const [nodes, rels] = await Promise.all([nodesRes.json(), relsRes.json()]);

        graphDataRef.current = { nodes, rels };
        setReady(true);
      } catch (error) {
        console.error("Failed to fetch graph data:", error);
      }
    };

    graphDataRef.current = null;
    setReady(false);
    fetchGraph();
  }, [graphName]);

  return {
    graphName,
    setGraphName: handleGraphNameChange,
    graphDataRef,
    ready,
  };
}
