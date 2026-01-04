import { useMemo } from "react";
import CLUSTERS from "../../../utils/heClusterSummaries.json";

import { SUMMARY_PREVIEW_LIMIT } from "../utils/constants";
import { safeId, safeLabel, safeType, truncate } from "../utils/nodeSafe";
import {
  extractCentrality,
  extractConnections,
  extractDestinationCallCount,
  extractClusterDestinationCount,
  extractNodeCount,
  extractTags,
} from "../utils/nodeExtractors";
import { formatCallFieldValue } from "../utils/callFields";

function cleanGraphName(name) {
  return String(name || "").replace(/_cose$/i, "");
}

function getActiveGraphName({ graphName, cyInstance }) {
  const direct = cleanGraphName(graphName);
  if (direct) return direct;

  try {
    if (!cyInstance || cyInstance?.destroyed?.()) return "";
    const scratch = cyInstance?.scratch?.("graphName");
    return cleanGraphName(scratch);
  } catch {
    return "";
  }
}

function countHasCallEdges(cyInstance, destinationId) {
  if (!destinationId || !cyInstance || cyInstance?.destroyed?.()) return null;
  try {
    const id = String(destinationId);
    const edges = cyInstance.edges(
      `[type = "HAS_CALL"][source = "${id}"], [category = "HAS_CALL"][source = "${id}"]`
    );
    const len = edges?.length ?? 0;
    return len > 0 ? len : null;
  } catch {
    return null;
  }
}

/**
 * Builds a stable view model consumed by UI components.
 * Keep all derived logic here; UI should be "dumb".
 */
export function useHoveredNodeModel({
  hoveredNode,
  cyInstance,
  graphName,
  isHoverFrozen = false,
}) {
  const hoveredKey =
    hoveredNode && typeof hoveredNode.id === "function"
      ? hoveredNode.id()
      : hoveredNode?.id ??
        hoveredNode?.call_id ??
        hoveredNode?.callId ??
        hoveredNode?.data?.id ??
        hoveredNode?.data?.call_id ??
        hoveredNode?.data?.callId ??
        "";

  return useMemo(() => {
    if (!hoveredNode) return null;

    // Normalize input (cy node vs plain object)
    const raw = (() => {
      // Cytoscape element
      if (typeof hoveredNode.data === "function") {
        try {
          const d = hoveredNode.data();
          return hoveredNode.__screenPosition ? { ...d, __screenPosition: hoveredNode.__screenPosition } : d;
        } catch {
          // fall through
        }
      }

      // Cytoscape JSON wrapper: { group, data: {...}, ...enrichment }
      if (hoveredNode.data && typeof hoveredNode.data === "object") {
        const { data, ...rest } = hoveredNode;
        return { ...data, ...rest };
      }

      // Plain object
      return hoveredNode;
    })();

    if (!raw || typeof raw !== "object") return null;

    const id = safeId(raw);
    const titleFull = safeLabel(raw) || "";
    const title = titleFull;

    const typeRaw = safeType(raw);
    const typeLower = String(typeRaw || "").toLowerCase();

    const nodeKind =
      typeLower.includes("cluster") || typeLower === "root"
        ? "cluster"
        : typeLower.includes("destination")
          ? "destination"
          : typeLower.includes("call")
            ? "call"
            : typeLower || "node";

    const isClusterNode = nodeKind === "cluster";
    const isDestinationNode = nodeKind === "destination";
    const isCallNode = nodeKind === "call";

    const typeLabel = isDestinationNode
      ? "Destination"
      : isClusterNode
        ? "Cluster"
        : isCallNode
          ? "Call"
          : truncate(typeRaw || "Node", 24);

    const nodeVisual = (() => {
      const fallback = {
        fill: "rgba(255,255,255,0.18)",
        borderColor: "#ffffff",
        borderWidthPx: 2,
      };

      if (!id || !cyInstance || cyInstance?.destroyed?.()) return fallback;

      try {
        const n = cyInstance.$id(String(id));
        if (!n || n.empty?.()) return fallback;
        const fill = n.style("background-color") || fallback.fill;
        return { ...fallback, fill };
      } catch {
        return fallback;
      }
    })();

    const tags = isClusterNode ? [] : extractTags(raw);

    const clusterDestinationCount = isClusterNode ? extractClusterDestinationCount(raw) : null;

    let destinationCallCount = isDestinationNode ? extractDestinationCallCount(raw, cyInstance) : null;
    if (isDestinationNode && destinationCallCount == null) {
      destinationCallCount = countHasCallEdges(cyInstance, id);
    }

    const explicitNodeCount = (isClusterNode || isDestinationNode) ? extractNodeCount(raw) : null;

    // nodeCount = size of graph opened by drilling into this node
    const nodeCount =
      typeof explicitNodeCount === "number"
        ? explicitNodeCount
        : isClusterNode && typeof clusterDestinationCount === "number"
          ? clusterDestinationCount + 1
          : isDestinationNode && typeof destinationCallCount === "number"
            ? destinationCallCount + 1
            : null;

    const activeGraph = getActiveGraphName({ graphName, cyInstance });
    const allowHeMetrics = activeGraph === "HE_2025";

    const metricCards = [];

    if (allowHeMetrics && !isClusterNode && !isDestinationNode && !isCallNode) {
      metricCards.push({
        key: "connections",
        label: "Connections",
        value: extractConnections(raw),
        variant: "number",
        fullWidth: false,
      });
      metricCards.push({
        key: "centrality",
        label: "Centrality",
        value: extractCentrality(raw),
        variant: "number",
        fullWidth: false,
      });
    }

    if (isCallNode) {
      const fields = [
        { key: "technology_readiness_level", label: "TRL" },
        { key: "min_contribution", label: "Min Contribution" },
        { key: "max_contribution", label: "Max Contribution" },
        { key: "indicative_budget", label: "Indicative Budget" },
      ];

      fields.forEach((f) => {
        metricCards.push({
          key: f.key,
          label: f.label,
          value: formatCallFieldValue(f.key, raw?.[f.key], raw),
          variant: "number",
          fullWidth: false,
        });
      });
    }

    const clusterSummary = (() => {
      if (!isClusterNode) return "";
      const meta = CLUSTERS?.[id] || CLUSTERS?.[cleanGraphName(id)];
      const s =
        meta?.summary ??
        raw?.clusterSummary ??
        raw?.summary_short ??
        raw?.short_summary ??
        raw?.summary ??
        raw?.description ??
        raw?.abstract ??
        raw?.details ??
        "";
      const ss = String(s || "").trim();
      if (!ss) return "";
      return ss.length > SUMMARY_PREVIEW_LIMIT
        ? `${ss.slice(0, SUMMARY_PREVIEW_LIMIT - 1)}…`
        : ss;
    })();

    return {
      id,
      nodeKind,
      isClusterNode,
      isDestinationNode,
      isCallNode,

      title,
      titleFull,
      typeLabel,
      nodeVisual,
      isHoverFrozen,

      destinationCallCount,
      clusterDestinationCount,
      nodeCount,
      tags,

      metricCards,
      clusterSummary,

      renderDestinationMinimal: isDestinationNode,
      showViewDetails: !isClusterNode,
      shouldShowHeaderChips: true,
    };
  }, [hoveredKey, hoveredNode, cyInstance, graphName, isHoverFrozen]);
}
