import { useMemo } from "react";

export function useGraphElements(graphData, layerKey) {
  return useMemo(() => {
    if (!graphData) return [];

    let nodes = Array.isArray(graphData.nodeElements)
      ? graphData.nodeElements
      : graphData.nodes || graphData.Nodes || [];

    let edges = Array.isArray(graphData.edgeElements)
      ? graphData.edgeElements
      : graphData.edges || graphData.Edges || [];

    // Cluster overview (Level 2): Calls must NOT be preloaded (layout/fit must ignore them)
    const isClusterOverview = String(layerKey || "").startsWith("Cluster_");
    if (isClusterOverview) {
      const callIds = new Set(
        nodes
          .filter((n) => {
            const d = n?.data || {};
            return d.type === "Call" || d.category === "Call";
          })
          .map((n) => n?.data?.id)
          .filter(Boolean)
      );

      nodes = nodes.filter((n) => !callIds.has(n?.data?.id));

      edges = edges.filter((e) => {
        const d = e?.data || {};
        const isHasCall = d.type === "HAS_CALL" || d.category === "HAS_CALL";
        const touchesCall = callIds.has(d.source) || callIds.has(d.target);
        return !isHasCall && !touchesCall;
      });
    }

    return [...nodes, ...edges];
  }, [graphData, layerKey]);
}
