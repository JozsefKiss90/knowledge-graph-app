import { useMemo } from "react";
import { buildElements } from "../../utils/buildElements";
import { getCallDateRange, bucketCallsByMonth } from "./utils";

// HE programme keys grouped by pillar
const PROGRAMMES_BY_PILLAR = {
  P1: ["ERC", "MSCA", "INFRA"],
  P2: ["Cluster_1", "Cluster_2", "Cluster_3", "Cluster_4", "Cluster_5", "Cluster_6", "MISS"],
  P3: ["EIC", "EIE"],
  WIDERA: ["WIDERA"],
};

const ALL_HE_PROGRAMMES = Object.values(PROGRAMMES_BY_PILLAR).flat();

const STANDALONE_PROGRAMMES = ["DEP", "ERASMUS", "CEF", "CREA", "EURATOM"];

function cleanKey(k) {
  return String(k || "").replace(/_cose$/i, "");
}

function isPillarKey(k) {
  return /^PILLAR_([A-Z0-9]+)$/i.test(String(k || ""));
}

function pillarIdFromKey(k) {
  const m = String(k || "").match(/^PILLAR_([A-Z0-9]+)$/i);
  return m ? m[1] : null;
}

function isDestKey(k) {
  return /^DEST_/i.test(String(k || ""));
}

/**
 * Extract all call nodes (with parsed date ranges) from a raw dataset.
 * Optionally filter to calls linked to a specific destination.
 */
function extractCallsFromRaw(raw, destinationId) {
  if (!raw) return [];

  const { nodeElements, edgeElements } = buildElements(raw);

  let callIds = null;
  if (destinationId) {
    callIds = new Set();
    for (const e of edgeElements) {
      const d = e?.data || {};
      const et = String(d.type || d.category || "").toUpperCase();
      if (et === "HAS_CALL" && String(d.source) === String(destinationId)) {
        callIds.add(String(d.target));
      }
    }
  }

  const calls = [];
  for (const n of nodeElements) {
    const d = n?.data || {};
    const t = String(d.type || d.category || "").toLowerCase();
    if (t !== "call") continue;
    if (callIds && !callIds.has(String(d.id))) continue;

    const range = getCallDateRange(d);
    if (!range) continue;

    calls.push({ id: d.id, ...range });
  }

  return calls;
}

/**
 * Determine which dataset keys to scan based on the current layer key.
 */
function resolveDatasetKeys(currentKey, loadFromStore) {
  const key = cleanKey(currentKey);

  if (key === "ROOT") {
    const allKeys = loadFromStore?.("__keys__") || [];
    return allKeys;
  }

  if (key === "HE_ROOT" || key === "HE_2025") {
    return ALL_HE_PROGRAMMES;
  }

  if (isPillarKey(key)) {
    const pid = pillarIdFromKey(key);
    return PROGRAMMES_BY_PILLAR[pid] || [];
  }

  // Specific programme / cluster
  if ([...ALL_HE_PROGRAMMES, ...STANDALONE_PROGRAMMES].includes(key)) {
    return [key];
  }

  // Destination layer: we need the parent dataset key (resolved by caller)
  // or a cluster key pattern
  if (/^Cluster_\d+$/i.test(key)) return [key];

  return [key];
}

/**
 * Hook: collects all calls from the store for the current layer, buckets by month.
 *
 * @param {Function} loadFromStore  - from useGraphData
 * @param {string}   currentKey     - current layer key (e.g. "ROOT", "Cluster_1", "DEST_xxx")
 * @param {Array}    levels         - breadcrumb level stack from NestedGraphController
 */
export function useTimelineData(loadFromStore, currentKey, levels) {
  return useMemo(() => {
    if (!loadFromStore || !currentKey) {
      return { buckets: [], totalCalls: 0, callsWithDates: [] };
    }

    const key = cleanKey(currentKey);
    let allCalls = [];

    if (isDestKey(key)) {
      // Destination layer: extract from parent dataset, filter by destination id
      const destId = key.slice(5); // strip "DEST_"
      // Find the parent dataset key from levels
      const parentLevel = levels?.length > 1 ? levels[levels.length - 2] : null;
      const parentKey = cleanKey(parentLevel?.key || parentLevel?.graphName || "");
      const raw = parentKey ? loadFromStore(parentKey) : null;
      allCalls = extractCallsFromRaw(raw, destId);
    } else {
      const datasetKeys = resolveDatasetKeys(key, loadFromStore);
      for (const dk of datasetKeys) {
        const raw = loadFromStore(cleanKey(dk));
        if (raw) {
          allCalls = allCalls.concat(extractCallsFromRaw(raw, null));
        }
      }
    }

    // Deduplicate by call id
    const seen = new Set();
    const unique = [];
    for (const c of allCalls) {
      const id = String(c.id);
      if (seen.has(id)) continue;
      seen.add(id);
      unique.push(c);
    }

    const buckets = bucketCallsByMonth(unique);
    // totalCalls = calls that have at least one date and fall within the current year
    const callsInYear = buckets.reduce((sum, b) => sum + b.count, 0);

    return {
      buckets,
      totalCalls: unique.length,
      callsInYear,
      callsWithDates: unique,
    };
  }, [loadFromStore, currentKey, levels]);
}
