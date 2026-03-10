import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

export const API_BASE = process.env.REACT_APP_API_URL;

const DEFAULT_CONFIG = {
  graphName: "HE_2025",
  buildNodeEndpoint: (id) => `${API_BASE}/nodes/${encodeURIComponent(id)}`,
  buildRelEndpoint: (id) =>
    `${API_BASE}/relationships/?from_id=${encodeURIComponent(id)}`,
  buildAllRelEndpoint: () => `${API_BASE}/relationships/`,
};

function isCallLike(obj) {
  if (!obj || typeof obj !== "object") return false;

  const rawType = String(obj.type || obj.category || "").toLowerCase();
  if (rawType === "call") return true;

  const hasDeadlines =
    (Array.isArray(obj.deadlines) && obj.deadlines.filter(Boolean).length > 0) ||
    obj.deadline != null;

  return (
    obj.call_id != null ||
    obj.identifier != null ||
    obj.topic_id != null ||
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

const createConfig = ({
  graphName,
  basePath,
  matchers,
  useGlobalRelationships = false,
}) => ({
  graphName,
  matchers,
  useGlobalRelationships,
  buildNodeEndpoint: (id) =>
    `${API_BASE}${basePath}/node/${encodeURIComponent(id)}`,
  buildRelEndpoint: (id) =>
    useGlobalRelationships
      ? `${API_BASE}${basePath}/relationships`
      : `${API_BASE}${basePath}/relationships?from_id=${encodeURIComponent(id)}`,
  buildAllRelEndpoint: () => `${API_BASE}${basePath}/relationships`,
});

const DATASET_CONFIGS = [
  createConfig({
    graphName: "Cluster_1",
    basePath: "/cluster1",
    useGlobalRelationships: true,
    matchers: [
      (value) => matchesClusterCode(value, "CL1"),
      (value) => value.startsWith("HORIZON-HLTH-"),
      (value) => value.startsWith("cluster1_"),
    ],
  }),
  createConfig({
    graphName: "Cluster_2",
    basePath: "/cluster2",
    matchers: [
      (value) => matchesClusterCode(value, "CL2"),
      (value) => value.startsWith("HORIZON-CL2-"),
      (value) => value.startsWith("cluster2_"),
    ],
  }),
  createConfig({
    graphName: "Cluster_3",
    basePath: "/cluster3",
    useGlobalRelationships: true,
    matchers: [
      (value) => matchesClusterCode(value, "CL3"),
      (value) => value.startsWith("cluster3_"),
    ],
  }),
  createConfig({
    graphName: "Cluster_4",
    basePath: "/cluster4",
    useGlobalRelationships: true,
    matchers: [
      (value) => matchesClusterCode(value, "CL4"),
      (value) => value.startsWith("cluster4_"),
    ],
  }),
  createConfig({
    graphName: "Cluster_5",
    basePath: "/cluster5",
    useGlobalRelationships: true,
    matchers: [
      (value) => matchesClusterCode(value, "CL5"),
      (value) => value.startsWith("cluster5_"),
    ],
  }),
  createConfig({
    graphName: "Cluster_6",
    basePath: "/cluster6",
    useGlobalRelationships: true,
    matchers: [
      (value) => matchesClusterCode(value, "CL6"),
      (value) => value.startsWith("cluster6_"),
    ],
  }),

  createConfig({
    graphName: "ERC",
    basePath: "/erc",
    matchers: [
      (value) => value.startsWith("ERC-"),
      (value) => value.startsWith("erc_"),
    ],
  }),
  createConfig({
    graphName: "MSCA",
    basePath: "/msca",
    matchers: [
      (value) => value.startsWith("MSCA-"),
      (value) => value.startsWith("HORIZON-MSCA-"),
      (value) => value.startsWith("msca_"),
    ],
  }),
  createConfig({
    graphName: "INFRA",
    basePath: "/infra",
    matchers: [
      (value) => value.startsWith("INFRA-"),
      (value) => value.startsWith("HORIZON-INFRA-"),
      (value) => value.startsWith("infra_"),
    ],
  }),
  createConfig({
    graphName: "MISS",
    basePath: "/missions",
    matchers: [
      (value) => value.startsWith("MISS-"),
      (value) => value.startsWith("mission_"),
      (value) => value.startsWith("missions_"),
      (value) => value.startsWith("HORIZON-MISS-"),
    ],
  }),
  createConfig({
    graphName: "EIC",
    basePath: "/eic",
    matchers: [
      (value) => value.startsWith("EIC-"),
      (value) => value.startsWith("HORIZON-EIC-"),
      (value) => value.startsWith("eic_"),
    ],
  }),
  createConfig({
    graphName: "EIE",
    basePath: "/eie",
    matchers: [
      (value) => value.startsWith("EIE-"),
      (value) => value.startsWith("HORIZON-EIE-"),
      (value) => value.startsWith("eie_"),
    ],
  }),
  createConfig({
    graphName: "WIDERA",
    basePath: "/widera",
    matchers: [
      (value) => value.startsWith("WIDERA-"),
      (value) => value.startsWith("HORIZON-WIDERA-"),
      (value) => value.startsWith("widera_"),
    ],
  }),
  createConfig({
    graphName: "DEP",
    basePath: "/dep",
    matchers: [
      (value) => value.startsWith("DIGITAL-"),
      (value) => value.startsWith("DEP-"),
      (value) => value.startsWith("dep_"),
    ],
  }),
  createConfig({
    graphName: "ERASMUS",
    basePath: "/erasmus",
    matchers: [
      (value) => value.startsWith("ERASMUS-"),
      (value) => value.startsWith("erasmus_"),
      (value) => value.includes("KA1"),
      (value) => value.includes("KA2"),
      (value) => value.includes("KA3"),
    ],
  }),
  createConfig({
    graphName: "CEF",
    basePath: "/cef",
    matchers: [
      (value) => value.startsWith("CEF-"),
      (value) => value.startsWith("cef_"),
    ],
  }),
  createConfig({
    graphName: "CREA",
    basePath: "/crea",
    matchers: [
      (value) => value.startsWith("CREA-"),
      (value) => value.startsWith("crea_"),
    ],
  }),
  createConfig({
    graphName: "EURATOM",
    basePath: "/euratom",
    matchers: [
      (value) => value.startsWith("EURATOM-"),
      (value) => value.startsWith("euratom_"),
    ],
  }),
];

function normalizeStoredGraphName(value) {
  return String(value || "").replace(/_cose$/i, "").trim();
}

function resolveConfigFromGraphName(graphName) {
  const normalized = normalizeStoredGraphName(graphName);
  return DATASET_CONFIGS.find((config) => config.graphName === normalized) || null;
}

export function getDatasetConfigForId(id, graphHint) {
  const normalized = String(id || "").trim();

  if (normalized) {
    const directMatch = DATASET_CONFIGS.find((config) =>
      config.matchers.some((matcher) => {
        try {
          return matcher(normalized);
        } catch (err) {
          console.warn("Dataset matcher failed:", err);
          return false;
        }
      })
    );
    if (directMatch) return directMatch;
  }

  const hinted = resolveConfigFromGraphName(graphHint);
  if (hinted) return hinted;

  const storedGraph = localStorage.getItem("nodeDetailGraphName");
  const stored = resolveConfigFromGraphName(storedGraph);
  if (stored) return stored;

  const activeGraph = localStorage.getItem("graphName");
  const active = resolveConfigFromGraphName(activeGraph);
  if (active) return active;

  return DEFAULT_CONFIG;
}

export const getClusterConfigForId = getDatasetConfigForId;

function persistGraphSelection(graphName) {
  if (!graphName) return;
  const prevLayoutIsCose = localStorage.getItem("graphName")?.endsWith("_cose");
  const storedName = prevLayoutIsCose ? `${graphName}_cose` : graphName;
  localStorage.setItem("nodeDetailGraphName", storedName);
}

function normalizeRelationsPayload(relJson) {
  const relationsData = relJson?.relationships || relJson || [];
  return Array.isArray(relationsData) ? relationsData : [];
}

function filterRelationsForNode(relations, nodeId) {
  return (Array.isArray(relations) ? relations : []).filter(
    (r) => r?.source === nodeId || r?.target === nodeId
  );
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

    const candidate = location.state?.nodeData || location.state?.data || null;
    if (!candidate) return null;
    if (candidate.id && id && candidate.id !== id) return null;
    return candidate;
  }, [initialNodeData, location.state, id]);

  const graphHint = useMemo(() => {
    return (
      location.state?.returnGraphName ||
      location.state?.graphName ||
      matchedLocationData?.graphName ||
      matchedLocationData?.source_graph ||
      null
    );
  }, [location.state, matchedLocationData]);

  const [nodeData, setNodeData] = useState(matchedLocationData || null);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(!matchedLocationData);
  const [connectedNodes, setConnectedNodes] = useState({});

  const fetchNeighborDetails = useCallback(
    async (neighborIds, config) => {
      if (!Array.isArray(neighborIds) || neighborIds.length === 0) return {};

      const entries = await Promise.all(
        neighborIds.map(async (neighborId) => {
          try {
            const cfg = getDatasetConfigForId(
              neighborId,
              config?.graphName || graphHint
            );
            const res = await fetch(cfg.buildNodeEndpoint(neighborId));
            if (!res.ok) return [neighborId, null];
            const json = await res.json();
            return [neighborId, json];
          } catch (err) {
            console.warn(`Failed to fetch neighbor ${neighborId}:`, err);
            return [neighborId, null];
          }
        })
      );

      return Object.fromEntries(entries.filter(([, value]) => !!value));
    },
    [graphHint]
  );

  const fetchNodeDetail = useCallback(
    async (nodeId) => {
      if (!nodeId) return;

      try {
        const preferExistingHeEntity = isHE2025Entity(matchedLocationData);
        const config = preferExistingHeEntity
          ? DEFAULT_CONFIG
          : getDatasetConfigForId(nodeId, graphHint);

        if (!preferExistingHeEntity) {
          persistGraphSelection(config.graphName);
        }

        const nodeEndpoint = config.buildNodeEndpoint(nodeId);
        const relEndpoint = preferExistingHeEntity
          ? DEFAULT_CONFIG.buildAllRelEndpoint()
          : config.buildRelEndpoint(nodeId);

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
        let relJson = await relRes.json();
        let relationsData = normalizeRelationsPayload(relJson);

        // Fallback for datasets whose detail route does not return filtered relationships reliably
        if (!preferExistingHeEntity && relationsData.length === 0) {
          try {
            const allRelRes = await fetch(config.buildAllRelEndpoint());
            if (allRelRes.ok) {
              const allRelJson = await allRelRes.json();
              const allRelations = normalizeRelationsPayload(allRelJson);
              relationsData = filterRelationsForNode(allRelations, nodeId);
            }
          } catch (fallbackErr) {
            console.warn("Relationship fallback failed:", fallbackErr);
          }
        }

        if (preferExistingHeEntity) {
          relationsData = filterRelationsForNode(relationsData, nodeId);
        }

        setNodeData(nodeJson || matchedLocationData || null);
        setRelations(relationsData);

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

        const neighborDetails = await fetchNeighborDetails(neighborIds, config);
        setConnectedNodes(neighborDetails || {});
      } catch (err) {
        console.error("Failed to load node detail:", err);
        if (matchedLocationData) {
          setNodeData(matchedLocationData);
        }
      } finally {
        setLoading(false);
      }
    },
    [fetchNeighborDetails, matchedLocationData, graphHint]
  );

  useEffect(() => {
    setRelations([]);
    setConnectedNodes({});
    setNodeData(matchedLocationData || null);
    setLoading(true);
  }, [id, matchedLocationData]);

  useEffect(() => {
    if (!id) return;
    fetchNodeDetail(id);
  }, [id, fetchNodeDetail]);

  return { id, nodeData, relations, connectedNodes, loading };
}