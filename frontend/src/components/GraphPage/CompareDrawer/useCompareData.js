import { useMemo } from "react";
import { buildElements } from "../../utils/buildElements";

// All Horizon Europe sub-programme keys
const HE_ALL_KEYS = [
  "Cluster_1", "Cluster_2", "Cluster_3", "Cluster_4", "Cluster_5", "Cluster_6",
  "ERC", "MSCA", "INFRA", "EIC", "EIE", "MISS", "WIDERA",
];

// Pillar → child programme keys
const PILLAR_CHILDREN = {
  PILLAR_P1: ["ERC", "MSCA", "INFRA"],
  PILLAR_P2: ["Cluster_1", "Cluster_2", "Cluster_3", "Cluster_4", "Cluster_5", "Cluster_6", "MISS"],
  PILLAR_P3: ["EIC", "EIE"],
  PILLAR_WIDERA: ["WIDERA"],
};

const SOURCE_TO_KEY = {
  cluster_1: "Cluster_1",
  cluster_2: "Cluster_2",
  cluster_3: "Cluster_3",
  cluster_4: "Cluster_4",
  cluster_5: "Cluster_5",
  cluster_6: "Cluster_6",
  dep: "DEP",
  erasmus: "ERASMUS",
  cef: "CEF",
  crea: "CREA",
  euratom: "EURATOM",
  eic: "EIC",
  eie: "EIE",
  erc: "ERC",
  msca: "MSCA",
  infra: "INFRA",
  missions: "MISS",
  horizon_miss: "MISS",
  widera: "WIDERA",
};

/**
 * Resolves a selected node to a compare key or list of keys to aggregate.
 * Returns { keys: string[] } — one key for a single programme, many for aggregates.
 */
function resolveCompareKeys(nodeData) {
  if (!nodeData) return null;

  const programmeKey = nodeData.programmeKey || "";
  const id = String(nodeData.id || "");

  // HE_ROOT → aggregate all HE sub-programmes
  if (programmeKey === "HE_ROOT" || id === "PROG_HE_ROOT") {
    return { keys: HE_ALL_KEYS };
  }

  // Pillar nodes → aggregate child programmes
  if (/^PILLAR_/i.test(id)) {
    const children = PILLAR_CHILDREN[id];
    if (children?.length) return { keys: children };
    // WIDERA pillar with no mapped children falls through
  }

  // Single programme key
  if (programmeKey && programmeKey !== "HE_ROOT") {
    return { keys: [programmeKey] };
  }

  // PROG_ prefixed synthetic nodes
  if (id.startsWith("PROG_")) {
    const k = id.replace("PROG_", "");
    if (k === "HE_ROOT") return { keys: HE_ALL_KEYS };
    return { keys: [k] };
  }

  // Nodes with source field (actual data nodes inside a programme)
  const src = String(nodeData.source || "").toLowerCase();
  if (SOURCE_TO_KEY[src]) return { keys: [SOURCE_TO_KEY[src]] };

  // Cluster nodes (CL1, CL2, etc.)
  if (/^CL\d+$/i.test(id)) {
    const num = id.replace(/^CL/i, "");
    return { keys: [`Cluster_${num}`] };
  }

  return id ? { keys: [id] } : null;
}

function parseBudget(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[^0-9.eE+-]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function collectFromElements(nodeElements) {
  const calls = [];
  const destinations = [];

  nodeElements.forEach((n) => {
    const t = String(n.data?.type || n.data?.category || "").toLowerCase();
    if (t === "call") calls.push(n);
    else if (t === "destination") destinations.push(n);
  });

  let totalBudget = 0;
  const topicSet = new Set();

  calls.forEach((c) => {
    const d = c.data || {};
    totalBudget += parseBudget(d.indicative_budget);

    // Collect topics from multiple possible fields
    const tagSources = [d.tags, d.keywords, d.related_topics];
    tagSources.forEach((tags) => {
      if (!tags) return;
      const list = Array.isArray(tags)
        ? tags
        : typeof tags === "string"
        ? tags.split(/[;,]/)
        : [];
      list.forEach((t) => {
        const trimmed = String(t).trim().toLowerCase();
        if (trimmed) topicSet.add(trimmed);
      });
    });
  });

  // Also collect topics from destination nodes
  destinations.forEach((n) => {
    const d = n.data || {};
    const tagSources = [d.tags, d.keywords, d.related_topics, d.themes];
    tagSources.forEach((tags) => {
      if (!tags) return;
      const list = Array.isArray(tags)
        ? tags
        : typeof tags === "string"
        ? tags.split(/[;,]/)
        : [];
      list.forEach((t) => {
        const trimmed = String(t).trim().toLowerCase();
        if (trimmed) topicSet.add(trimmed);
      });
    });
  });

  return {
    callCount: calls.length,
    destinationCount: destinations.length,
    totalBudget,
    topicSet,
  };
}

function computeMetrics(keys, loadFromStore) {
  if (!keys?.length || !loadFromStore) return null;

  let totalBudget = 0;
  let totalCalls = 0;
  let totalDestinations = 0;
  const topicSet = new Set();
  let anyDataFound = false;

  for (const key of keys) {
    const raw = loadFromStore(key);
    if (!raw) continue;

    const { nodeElements } = buildElements(raw);
    if (!nodeElements?.length) continue;

    anyDataFound = true;
    const result = collectFromElements(nodeElements);
    totalBudget += result.totalBudget;
    totalCalls += result.callCount;
    totalDestinations += result.destinationCount;
    result.topicSet.forEach((t) => topicSet.add(t));
  }

  if (!anyDataFound) return null;

  const avgCallSize = totalCalls > 0 ? totalBudget / totalCalls : 0;

  return {
    totalBudget,
    pillarsOrStrands: totalDestinations,
    openCalls: totalCalls,
    avgCallSize,
    topicCount: topicSet.size,
    topicList: [...topicSet],
  };
}

function computeSharedTopics(topicsA, topicsB) {
  if (!topicsA?.length || !topicsB?.length) return [];
  const setB = new Set(topicsB.map((t) => t.toLowerCase()));
  return topicsA.filter((t) => setB.has(t.toLowerCase()));
}

export function useCompareData(nodeA, nodeB, loadFromStore) {
  const resolvedA = useMemo(() => resolveCompareKeys(nodeA), [nodeA]);
  const resolvedB = useMemo(() => resolveCompareKeys(nodeB), [nodeB]);

  return useMemo(() => {
    if (!resolvedA || !resolvedB || !loadFromStore) {
      return { metricsA: null, metricsB: null, sharedTopics: [], topOverlap: [] };
    }

    const metricsA = computeMetrics(resolvedA.keys, loadFromStore);
    const metricsB = computeMetrics(resolvedB.keys, loadFromStore);

    const sharedTopics = computeSharedTopics(
      metricsA?.topicList || [],
      metricsB?.topicList || []
    );

    const topOverlap = sharedTopics.slice(0, 5);

    return { metricsA, metricsB, sharedTopics, topOverlap };
  }, [resolvedA, resolvedB, loadFromStore]);
}

export { resolveCompareKeys };
