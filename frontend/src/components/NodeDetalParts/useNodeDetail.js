// src/components/NodeDetail/useNodeDetail.js

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function getGraphNameFromId(id) {
  if (id.startsWith("cluster2_")) return "Cluster_2";
  if (id.startsWith("cluster4_")) return "Cluster_4";
  if (id === "CL3" || id.startsWith("CL3:") || id.startsWith("HORIZON-CL3-")) return "Cluster_3";
  return "HE_2025";
}

export function useNodeDetail() {
  const { id } = useParams();
  const [nodeData, setNodeData] = useState(null);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNodeAndRelations = async () => {
      try {
        setLoading(true);
        const prevLayout = localStorage.getItem("graphName")?.endsWith("_cose");
        const graphName = getGraphNameFromId(id);
        const restoredGraphName = prevLayout ? `${graphName}_cose` : graphName;
        localStorage.setItem("graphName", restoredGraphName);

        let nodeEndpoint, relEndpoint;

        if (
          id.startsWith("cluster2_call_") ||
          id.startsWith("cluster2_destination_")
        ) {
          nodeEndpoint = `${process.env.REACT_APP_API_URL}/cluster2/node/${encodeURIComponent(id)}`;
          relEndpoint = `${process.env.REACT_APP_API_URL}/cluster2/relationships?from_id=${encodeURIComponent(id)}`;
        }
          else if (
          id.startsWith("cluster4_call_") ||
          id.startsWith("cluster4_theme_") ||
          id.startsWith("cluster4_destination_")
        ) {
          nodeEndpoint = `${process.env.REACT_APP_API_URL}/cluster4/node/${encodeURIComponent(id)}`;
          relEndpoint = `${process.env.REACT_APP_API_URL}/cluster4/relationships?from_id=${encodeURIComponent(id)}`;
        } 
        else if (id === "CL3" || id.startsWith("CL3:") || id.startsWith("HORIZON-CL3-")) {
          nodeEndpoint = `${process.env.REACT_APP_API_URL}/cluster3-v2/node/${encodeURIComponent(id)}`;
          relEndpoint = `${process.env.REACT_APP_API_URL}/cluster3-v2/relationships?from_id=${encodeURIComponent(id)}`;
        } else if (id === "CL5" || id.startsWith("CL5:") || id.startsWith("HORIZON-CL5-")) {
          nodeEndpoint = `${process.env.API_BASE}/cluster5-v2/node/${encodeURIComponent(id)}`;
          relEndpoint  = `${process.env.API_BASE}/cluster5-v2/relationships?from_id=${encodeURIComponent(id)}`;
        }
        else {
          nodeEndpoint = `${process.env.REACT_APP_API_URL}/nodes/${encodeURIComponent(id)}`;
          relEndpoint = `${process.env.REACT_APP_API_URL}/relationships/?from_id=${encodeURIComponent(id)}`;
        }

        const [nodeRes, relRes] = await Promise.all([
          fetch(nodeEndpoint),
          fetch(relEndpoint),
        ]);

        const nodeJson = await nodeRes.json();
        const relJson = await relRes.json();
        console.log(nodeJson)
        setNodeData(nodeJson);
        setRelations(relJson.relationships || []);
      } catch (err) {
        console.error("Failed to load node detail:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNodeAndRelations();
  }, [id]);

  return { id, nodeData, relations, loading };
}
