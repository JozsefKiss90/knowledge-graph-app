// src/components/GraphPage/useGraphData.js
import { useEffect, useRef, useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL;
console.log("API base:", API_BASE);

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
  }, []);

  useEffect(() => {
    const fetchGraph = async () => {
      try { 
        const baseName = graphName.replace("_cose", "");
        let nodesUrl, relsUrl = [];

        if (baseName === "HE_2025") {
          nodesUrl = `${API_BASE}/nodes/`;
          relsUrl = `${API_BASE}/relationships/`;
        } else if (baseName === "Cluster_4") {
          nodesUrl = `${API_BASE}/cluster4/nodes`;
          relsUrl = `${API_BASE}/cluster4/relationships`;
        } else if (baseName === "Cluster_2") {
          nodesUrl = `${API_BASE}/cluster2/nodes`;
          relsUrl = `${API_BASE}/cluster2/relationships`;
        }

        const [nodesRes, relsRes] = await Promise.all([
          fetch(nodesUrl),
          fetch(relsUrl),
        ]);

        const nodes = await nodesRes.json();
        const rels = await relsRes.json();

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
    ready
  };
}
