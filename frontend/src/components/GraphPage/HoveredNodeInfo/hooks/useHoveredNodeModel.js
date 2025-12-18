import { useMemo } from "react";

import { SUMMARY_PREVIEW_LIMIT } from "../utils/constants";
import { safeId, safeLabel, safeType, truncate } from "../utils/nodeSafe";
import {
  extractCentrality,
  extractConnections,
  extractDestinationCallCount,
  extractTags,
} from "../utils/nodeExtractors";
import { formatCallFieldValue } from "../utils/callFields";

/**
 * Builds a stable view model consumed by UI components.
 * Keep all derived logic here; UI should be "dumb".
 */
export function useHoveredNodeModel({ hoveredNode, cyInstance, isHoverFrozen = false }) {
  return useMemo(() => {
    if (!hoveredNode) return null;

    // Normalize input (cy node vs plain object)
    const raw = hoveredNode?.data ? hoveredNode.data : hoveredNode;

    const id = safeId(raw);
    const titleFull = safeLabel(raw) || "";
    const title = titleFull;

    const typeRaw = safeType(raw);
    const typeLower = String(typeRaw || "").toLowerCase();

    const nodeKind =
      typeLower.includes("cluster")
        ? "cluster"
        : typeLower.includes("destination")
          ? "destination"
          : typeLower.includes("call")
            ? "call"
            : typeLower || "node";

    const isClusterNode = nodeKind === "cluster";
    const isDestinationNode = nodeKind === "destination";
    const isCallNode = nodeKind === "call";

    // Type label shown in chip
    const typeLabel = isDestinationNode
      ? "Destination"
      : isClusterNode
        ? "Cluster"
        : isCallNode
          ? "Call"
          : truncate(typeRaw || "Node", 24);

    // Node visual (color dot)
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

    const tags = extractTags(raw);

    // Destination aggregated count (calls)
    const destinationCallCount = isDestinationNode ? extractDestinationCallCount(raw) : 0;

    // Connections / centrality always available as top-level metric cards
    const connectionsValue = extractConnections(raw);
    const centralityValue = extractCentrality(raw);

    const metricCards = [];

    metricCards.push({
      key: "connections",
      label: "Connections",
      value: connectionsValue,
      variant: "number",
      fullWidth: false,
    });

    metricCards.push({
      key: "centrality",
      label: "Centrality",
      value: centralityValue,
      variant: "number",
      fullWidth: false,
    });

    // Call node metric cards
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

    // Cluster summary
    const clusterSummary = (() => {
      if (!isClusterNode) return "";
      const s =
        raw?.summary ??
        raw?.short_summary ??
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

    // Behavioral flags for UI
    const renderDestinationMinimal = isDestinationNode;
    const showViewDetails = true;
    const shouldShowHeaderChips = true;

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
      tags,

      metricCards,
      clusterSummary,

      renderDestinationMinimal,
      showViewDetails,
      shouldShowHeaderChips,
    };
  }, [hoveredNode, cyInstance, isHoverFrozen]);
}
