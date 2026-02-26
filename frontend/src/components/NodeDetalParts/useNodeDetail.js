// src/components/NodeDetail/useNodeDetail.js

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

export const API_BASE = process.env.REACT_APP_API_URL; // <-- export

const DEFAULT_CONFIG = {
  graphName: "HE_2025",
  buildNodeEndpoint: (id) => `${API_BASE}/nodes/${encodeURIComponent(id)}`,
  buildRelEndpoint: (id) => `${API_BASE}/relationships/?from_id=${encodeURIComponent(id)}`,
};

// Treat as a "call" when we have explicit call fields (updated for new schema).
function isCallLike(obj) {
  if (!obj || typeof obj !== "object") return false;

  const rawType = String(obj.type || obj.category || "").toLowerCase();
  if (rawType === "call") return true;

  const hasDeadlines =
    (Array.isArray(obj.deadlines) && obj.deadlines.filter(Boolean).length > 0) ||
    obj.deadline != null;

  return (
    obj.call_id != null ||              // legacy
    obj.identifier != null ||           // new identity key
    obj.topic_id != null ||             // new identity key
    obj.type_of_action != null ||
    obj.min_contribution != null ||
    obj.max_contribution != null ||
    obj.indicative_budget != null ||
    obj.expected_outcome != null || 
    obj.scope != null ||
    hasDeadlines ||
    obj.opening_date != null ||
    obj.award_criteria_scoring_thresholds != null ||
    obj.admissibility_conditions != null ||
    obj.eligible_countries != null ||
    obj.other_eligibility_conditions != null ||
    obj.financial_and_operational_capacity != null ||
    obj.submission_and_evaluation_process != null
  );
}

function isHE2025Entity(obj) {
  const source = String(obj?.source || "").toLowerCase();
  return source === "he_2025" && !isCallLike(obj);
}

const matchesClusterCode = (value = "", clusterCode) =>
  value === clusterCode ||
  value.startsWith(`${clusterCode}:`) ||
  value.startsWith(`HORIZON-${clusterCode}-`);

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
    matchers: [
      (value) => value.startsWith("cluster2_"),
      (value) => matchesClusterCode(value, "CL2"),
      (value) => value.startsWith("HORIZON-CL2-"),
    ],
  }),

  // CL3
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

  const storedGraph = (localStorage.getItem("nodeDetailGraphName") || "").replace("_cose", "");
  const storedConfig = CLUSTER_CONFIGS.find((config) => config.graphName === storedGraph);
  return storedConfig || DEFAULT_CONFIG;
}

function persistGraphSelection(graphName) {
  if (!graphName) return;
  const prevLayoutIsCose = localStorage.getItem("graphName")?.endsWith("_cose");
  const storedName = prevLayoutIsCose ? `${graphName}_cose` : graphName;
  localStorage.setItem("nodeDetailGraphName", storedName);
}

export function useNodeDetail(options = {}) {
  const { idOverride, initialNodeData } = options || {};

  const { id: routeParamId } = useParams();
  const location = useLocation();

  const routeId = idOverride != null ? idOverride : routeParamId;
  const id = routeId ? decodeURIComponent(routeId) : routeId;

  const matchedLocationData = useMemo(() => {
    if (initialNodeData && (!id || initialNodeData.id === id)) {
      return initialNodeData;
    }
    const candidate = location.state?.nodeData;
    if (!candidate) return null;
    if (candidate.id && id && candidate.id !== id) return null;
    return candidate;
  }, [initialNodeData, location.state, id]);

  const [nodeData, setNodeData] = useState(matchedLocationData || null);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(!matchedLocationData);
  const [connectedNodes, setConnectedNodes] = useState({});

  const fetchNeighborDetails = useCallback(async (neighborIds) => {
    // ... unchanged ...
  }, []);

  const fetchNodeDetail = useCallback(
    async (nodeId) => {
      if (!nodeId) return;

      try {
        const preferExistingHeEntity = isHE2025Entity(matchedLocationData);

        const clusterConfig = preferExistingHeEntity ? DEFAULT_CONFIG : getClusterConfigForId(nodeId);

        if (!preferExistingHeEntity) {
          persistGraphSelection(clusterConfig.graphName);
        }

        const relEndpoint = preferExistingHeEntity
          ? `${API_BASE}/relationships/`
          : clusterConfig.buildRelEndpoint(nodeId);

        const nodeEndpoint = clusterConfig.buildNodeEndpoint(nodeId);

        const shouldFetchNode = !preferExistingHeEntity || !matchedLocationData;

        const [nodeRes, relRes] = await Promise.all([
          shouldFetchNode ? fetch(nodeEndpoint) : Promise.resolve(null),
          fetch(relEndpoint),
        ]);

        if (shouldFetchNode && nodeRes && !nodeRes.ok) {
          throw new Error(`Node fetch failed with status ${nodeRes.status}`);
        }
        if (!relRes.ok) {
          throw new Error(`Relationship fetch failed with status ${relRes.status}`);
        }

        const nodeJson = shouldFetchNode && nodeRes ? await nodeRes.json() : null;
        const relJson = await relRes.json();

        let relationsData = relJson.relationships || relJson || [];
        if (preferExistingHeEntity && Array.isArray(relationsData)) {
          relationsData = relationsData.filter((r) => r?.source === nodeId || r?.target === nodeId);
        }

        if (nodeJson) {
          if (preferExistingHeEntity && isCallLike(nodeJson)) {
            // keep HE entity payload
          } else {
            setNodeData(nodeJson);
          }
        }

        setRelations(relationsData);

        if (preferExistingHeEntity && matchedLocationData) {
          setNodeData((prev) => prev || matchedLocationData);
        }

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
        if (neighborDetails) setConnectedNodes(neighborDetails);
      } catch (err) {
        console.error("Failed to load node detail:", err);
      } finally {
        setLoading(false);
      }
    },
    [fetchNeighborDetails, matchedLocationData]
  );

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
