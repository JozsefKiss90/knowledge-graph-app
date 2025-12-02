// src/components/NodeDetail/useNodeDetail.js

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

export const API_BASE = process.env.REACT_APP_API_URL;  // <-- export

const DEFAULT_CONFIG = {
  graphName: "HE_2025",
  buildNodeEndpoint: (id) =>
    `${API_BASE}/nodes/${encodeURIComponent(id)}`,
  buildRelEndpoint: (id) =>
    `${API_BASE}/relationships/?from_id=${encodeURIComponent(id)}`,
};

const matchesClusterCode = (value = "", clusterCode) =>
  value === clusterCode ||
  value.startsWith(`${clusterCode}:`) ||
  value.startsWith(`HORIZON-${clusterCode}-`);

// src/components/NodeDetail/useNodeDetail.js

const createClusterConfig = ({ graphName, basePath, matchers, useGlobalRelationships = false }) => ({
  graphName,
  matchers,
  buildNodeEndpoint: (id) => `${API_BASE}${basePath}/node/${encodeURIComponent(id)}`,
  buildRelEndpoint: (id) =>
    useGlobalRelationships
      ? `${API_BASE}${basePath}/relationships`
      : `${API_BASE}${basePath}/relationships?from_id=${encodeURIComponent(id)}`,
});

const CLUSTER_CONFIGS = [
  // CL1
  createClusterConfig({
    graphName: "Cluster_1_2026",
    basePath: "/cluster1",
    useGlobalRelationships: true,
    matchers: [
      (value) => matchesClusterCode(value, "CL1"),
      (value) => value.startsWith("HORIZON-HLTH-"),
    ],
  }),

  // CL2 – keep existing behaviour for now
  createClusterConfig({
    graphName: "Cluster_2",
    basePath: "/cluster2",
    // useGlobalRelationships: false  (default)
    matchers: [
      (value) => value.startsWith("cluster2_"),
      (value) => matchesClusterCode(value, "CL2"),
      (value) => value.startsWith("HORIZON-CL2-"),
    ],
  }),

  // CL3 (no longer special, same as others)
  createClusterConfig({
    graphName: "Cluster_3",
    basePath: "/cluster3",
    useGlobalRelationships: true,
    matchers: [(value) => matchesClusterCode(value, "CL3")],
  }),

  // CL4
  createClusterConfig({
    graphName: "Cluster_4",
    basePath: "/cluster4",
    useGlobalRelationships: true,
    matchers: [
      (value) => matchesClusterCode(value, "CL4"),
      (value) => value.startsWith("cluster4_"),
    ],
  }),

  // CL5
  createClusterConfig({
    graphName: "Cluster_5",
    basePath: "/cluster5",
    useGlobalRelationships: true,
    matchers: [(value) => matchesClusterCode(value, "CL5")],
  }),

  // CL6
  createClusterConfig({
    graphName: "Cluster_6_2026",
    basePath: "/cluster6",
    useGlobalRelationships: true,
    matchers: [(value) => matchesClusterCode(value, "CL6")],
  }),
];


export function getClusterConfigForId(id) {
  const normalized = (id || "").trim();
  if (normalized) {
    const directMatch = CLUSTER_CONFIGS.find((config) =>
      config.matchers.some((matcher) => {
        try {
          return matcher(normalized);
        } catch (err) {
          console.warn("Cluster matcher failed:", err);
          return false;
        }
      })
    );
    if (directMatch) return directMatch;
  }

  const storedGraph = (localStorage.getItem("graphName") || "").replace("_cose", "");
  const storedConfig = CLUSTER_CONFIGS.find((config) => config.graphName === storedGraph);
  return storedConfig || DEFAULT_CONFIG;
}

function persistGraphSelection(graphName) {
  if (!graphName) return;
  const prevLayoutIsCose = localStorage.getItem("graphName")?.endsWith("_cose");
  const storedName = prevLayoutIsCose ? `${graphName}_cose` : graphName;
  localStorage.setItem("graphName", storedName);
}

export function useNodeDetail() {
  const { id: routeParamId } = useParams();
  const location = useLocation();
  const id = routeParamId ? decodeURIComponent(routeParamId) : routeParamId;
  const matchedLocationData = useMemo(() => {
    const candidate = location.state?.nodeData;
    if (!candidate) return null;
    if (candidate.id && id && candidate.id !== id) return null;
    return candidate;
  }, [location.state, id]);

  const [nodeData, setNodeData] = useState(matchedLocationData || null);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(!matchedLocationData);
  const [connectedNodes, setConnectedNodes] = useState({});

  const fetchNeighborDetails = useCallback(async (neighborIds) => {
    if (!neighborIds || neighborIds.length === 0) return {};

    const detailEntries = await Promise.all(
      neighborIds.map(async (neighborId) => {
        const config = getClusterConfigForId(neighborId);
        const nodeEndpoint = config.buildNodeEndpoint(neighborId);
        try {
          const res = await fetch(nodeEndpoint);
          if (!res.ok) {
            throw new Error(`Failed neighbor fetch (${res.status})`);
          }
          const detail = await res.json();
          return [neighborId, detail];
        } catch (error) {
          console.error("Failed to fetch neighbor node detail:", error);
          return [neighborId, { id: neighborId }];
        }
      })
    );

    return detailEntries.reduce((acc, [neighborId, detail]) => {
      if (neighborId && detail) {
        acc[neighborId] = { ...detail, id: detail.id || neighborId };
      }
      return acc;
    }, {});
  }, []);

  const fetchNodeDetail = useCallback(async (nodeId) => {
    if (!nodeId) return;
    try {
      const clusterConfig = getClusterConfigForId(nodeId);
      persistGraphSelection(clusterConfig.graphName);

      const nodeEndpoint = clusterConfig.buildNodeEndpoint(nodeId);
      const relEndpoint = clusterConfig.buildRelEndpoint(nodeId);
      const [nodeRes, relRes] = await Promise.all([
        fetch(nodeEndpoint),
        fetch(relEndpoint),
      ]);

      if (!nodeRes.ok) {
        throw new Error(`Node fetch failed with status ${nodeRes.status}`);
      }
      if (!relRes.ok) {
        throw new Error(`Relationship fetch failed with status ${relRes.status}`);
      }

      const nodeJson = await nodeRes.json();
      const relJson = await relRes.json();
      const relationsData = relJson.relationships || [];

      setNodeData(nodeJson);
      setRelations(relationsData);
      console.log("Fetched nodes:", nodeJson); 
      const neighborIds = Array.from(
        new Set(
          relationsData.flatMap((rel) => {
            const ids = [];
            if (rel.source && rel.source !== nodeId) ids.push(rel.source);
            if (rel.target && rel.target !== nodeId) ids.push(rel.target);
            return ids;
          })
        )
      );

      const neighborDetails = await fetchNeighborDetails(neighborIds);
      if (neighborDetails) {
        setConnectedNodes(neighborDetails);
      }
    } catch (err) {
      console.error("Failed to load node detail:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchNeighborDetails]);

  useEffect(() => {
    setRelations([]);
    setConnectedNodes({});
    if (matchedLocationData) {
      setNodeData(matchedLocationData);
      setLoading(false);
    } else {
      setNodeData(null);
      setLoading(true);
    }
  }, [id, matchedLocationData]);

  useEffect(() => {
    if (!id) return;
    fetchNodeDetail(id);
  }, [id, fetchNodeDetail]);

  return { id, nodeData, relations, connectedNodes, loading };
}
