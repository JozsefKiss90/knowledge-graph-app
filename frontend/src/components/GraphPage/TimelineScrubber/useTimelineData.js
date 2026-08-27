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

// Map every sub-programme key to its top-level parent
const PARENT_PROGRAMME = {};
for (const prog of ALL_HE_PROGRAMMES) {
  PARENT_PROGRAMME[prog] = "HE";
}
for (const prog of STANDALONE_PROGRAMMES) {
  PARENT_PROGRAMME[prog] = prog;
}

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
      // Destination layer: extract from the parent dataset, filtered to this destination.
      const destId = key.slice(5); // strip "DEST_"
      // The level entry records the dataset it was opened from in `graphName`; the
      // breadcrumb entry above it is the fallback when the stack was rebuilt.
      const currentLevel = levels?.find?.((l) => cleanKey(l?.key) === key) || null;
      const parentLevel = levels?.length > 1 ? levels[levels.length - 2] : null;
      const parentKey = cleanKey(
        currentLevel?.graphName || parentLevel?.key || parentLevel?.graphName || ""
      );
      const raw = parentKey ? loadFromStore(parentKey) : null;
      allCalls = extractCallsFromRaw(raw, destId);
      // Same programme label the cluster layer uses — only the ROOT view rolls
      // sub-programmes up to their top-level parent.
      allCalls.forEach(c => { c.programme = parentKey; });
    } else {
      const datasetKeys = resolveDatasetKeys(key, loadFromStore);
      const useParent = key === "ROOT";
      for (const dk of datasetKeys) {
        const raw = loadFromStore(cleanKey(dk));
        if (raw) {
          const calls = extractCallsFromRaw(raw, null);
          const prog = useParent
            ? (PARENT_PROGRAMME[cleanKey(dk)] || cleanKey(dk))
            : cleanKey(dk);
          calls.forEach(c => { c.programme = prog; });
          allCalls = allCalls.concat(calls);
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

    // The header counts what the bars actually draw. The window spans the data, so in
    // practice that is every dated call in view — but if the ten-year ceiling ever
    // engages, the count follows the window rather than quietly overstating it.
    const windowStart = buckets[0]?.date || null;
    const lastBucket = buckets[buckets.length - 1]?.date || null;
    const windowEnd = lastBucket
      ? new Date(lastBucket.getFullYear(), lastBucket.getMonth() + 1, 0, 23, 59, 59, 999)
      : null;
    const totalCalls =
      windowStart && windowEnd
        ? unique.filter((c) => {
            const from = c.openDate || c.closeDate;
            const to = c.closeDate || c.openDate;
            return from && to && from <= windowEnd && to >= windowStart;
          }).length
        : unique.length;

    return {
      buckets,
      totalCalls,
      callsWithDates: unique,
    };
  }, [loadFromStore, currentKey, levels]);
}
