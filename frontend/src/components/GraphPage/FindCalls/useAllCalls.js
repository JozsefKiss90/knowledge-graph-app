// src/components/GraphPage/FindCalls/useAllCalls.js
//
// Tier 3.3 — a flat, deduped, source-agnostic list of every preloaded call with
// the fields the Find-calls workspace facets on. Modeled on buildCallLocator's
// iteration (same buildElements + collapse pipeline) so a call's id here matches
// the graph node id used by the locate/highlight pipeline.
//
// Unlike useDashboardData, this KEEPS calls with no parseable date (status
// "unknown", year null) so the workspace can list every call.

import { useMemo } from "react";
import { buildElements, collapseSingleCallDestinations } from "../../utils/buildElements";
import { getCallDateRange, PROGRAMME_DISPLAY } from "../TimelineScrubber/utils";
import { extractTags } from "../HoveredNodeInfo/utils/nodeExtractors";
import { normalizeActionType, parseBudget, budgetBucketKey, computeStatus } from "./callFacets";

const TOP_LEVEL_COLORS = {
  HE: "#22C55E",
  DEP: "#60A5FA",
  ERASMUS: "#A78BFA",
  CEF: "#FBBF24",
  CREA: "#F472B6",
  EURATOM: "#22D3EE",
};

const isCallNode = (d) => String(d?.type || d?.category || "").toLowerCase() === "call";

function topLevelProgramme(key) {
  if (/^(Cluster_\d|ERC|MSCA|INFRA|MISS|EIC|EIE|WIDERA)/.test(key)) return "HE";
  return key; // DEP / ERASMUS / CEF / CREA / EURATOM are their own top-level programme
}

export function useAllCalls(loadFromStore) {
  return useMemo(() => {
    const out = [];
    const seen = new Set();
    const now = new Date();

    let keys = [];
    try {
      keys = loadFromStore?.("__keys__") || [];
    } catch {
      keys = [];
    }

    for (const key of keys) {
      let raw = null;
      try {
        raw = loadFromStore?.(key);
      } catch {
        raw = null;
      }
      if (!raw) continue;

      let collapsed;
      try {
        collapsed = collapseSingleCallDestinations(buildElements(raw));
      } catch {
        continue;
      }

      const nodes = collapsed?.nodeElements || [];
      const disp = PROGRAMME_DISPLAY[key] || {};
      const color = disp.color || TOP_LEVEL_COLORS[topLevelProgramme(key)] || "#60A5FA";

      for (const n of nodes) {
        const d = n?.data || {};
        if (!isCallNode(d)) continue;
        const id = d.id != null ? String(d.id) : "";
        if (!id || seen.has(id)) continue; // first programme wins
        seen.add(id);

        const range = getCallDateRange(d);
        const openDate = range?.openDate || null;
        const closeDate = range?.closeDate || null;
        const budget = parseBudget(d);
        const tags = extractTags(d) || [];

        out.push({
          id,
          label: d.label || d.name || id,
          programmeKey: key,
          programmeLabel: disp.label || key,
          programmeColor: color,
          status: computeStatus(openDate, closeDate, now),
          openDate,
          closeDate,
          // "Deadline year" facet: derive strictly from the deadline so opening-only
          // calls fall into the undated bucket rather than claiming a false deadline.
          year: closeDate ? closeDate.getFullYear() : null,
          budget,
          budgetBucket: budgetBucketKey(budget),
          typeOfAction: normalizeActionType(d.type_of_action || d.action_type || d.call_type),
          tags,
          tagSource: d.cordis_tag_source ? "cordis" : "work-programme",
          deadline: d.deadline || null,
          url: d.url || null,
        });
      }
    }

    // Default order: soonest deadline first; dateless calls last.
    out.sort((a, b) => {
      const at = a.closeDate ? a.closeDate.getTime() : Infinity;
      const bt = b.closeDate ? b.closeDate.getTime() : Infinity;
      return at - bt;
    });

    return out;
  }, [loadFromStore]);
}
