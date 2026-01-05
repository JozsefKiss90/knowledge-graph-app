import { PLACEHOLDER } from "./constants";

export function extractDestinationCallCount(node, cyInstance) {
  // Prefer explicit numeric fields; BUT treat 0 as "unknown" on aggregated layers unless corroborated.
  const direct =
    node?.call_count ??
    node?.calls_count ??
    node?.callsCount ??
    node?.num_calls ??
    node?.callCount ??
    node?.n_calls ??
    node?.nCalls ??
    node?.total_calls ??
    node?.totalCalls;

  // If > 0, it's definitely real.
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) return direct;

  // If 0, try to corroborate from other structures (arrays/strings/edges).
  // (If corroboration fails, return null to avoid rendering misleading 0 chips.)
  const arrCandidates = [
    node?.calls,
    node?.call_ids,
    node?.callIds,
    node?.call_nodes,
    node?.callNodes,
    node?.children_calls,
    node?.childrenCalls,
  ];
  for (const v of arrCandidates) {
    if (Array.isArray(v)) return v.length; // could be 0, but then it's truly known
  }

  const strCandidates = [node?.call_ids, node?.callIds];
  for (const v of strCandidates) {
    if (typeof v === "string") {
      const n = v
        .split(/[;,|\s]+/)
        .map((s) => s.trim())
        .filter(Boolean).length;
      if (n > 0) return n;
    }
  }

  // Count HAS_CALL edges only if the current CY layer contains them
  try {
    const id = String(node?.id ?? "");
    if (!id || !cyInstance || cyInstance.destroyed?.()) return null;

    const edges = cyInstance.edges(
      `[type = "HAS_CALL"][source = "${id}"], [category = "HAS_CALL"][source = "${id}"]`
    );
    const len = edges?.length ?? 0;
    if (len > 0) return len;
  } catch {
    // ignore
  }

  // If direct was explicitly 0 but we couldn't corroborate it, treat as unknown.
  if (typeof direct === "number" && Number.isFinite(direct) && direct === 0) return null;

  return null;
}
function toNumberMaybe(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseInt(v.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function extractClusterDestinationCount(node) {
  const v =
    node?.destination_count ??
    node?.destinations_count ??
    node?.destinationCount ??
    node?.destinationsCount ??
    node?.n_destinations ??
    node?.nDestinations ??
    node?.size ??                 // some datasets use size for member count
    node?.member_count ??
    node?.memberCount;

  const n = toNumberMaybe(v);
  return typeof n === "number" ? n : null;
}


/**
 * Best-effort extraction for "how many nodes does this sub-graph contain".
 * Used for Cluster and Destination hover cards (root + cluster levels).
 */
export function extractNodeCount(node) {
  const v =
    node?.node_count ??
    node?.nodes_count ??
    node?.nodeCount ??
    node?.nodesCount ??
    node?.n_nodes ??
    node?.nNodes ??
    node?.count ??
    node?.total_nodes ??
    node?.totalNodes;

  const n = (function toNumberMaybe(x) {
    if (typeof x === "number" && Number.isFinite(x)) return x;
    if (typeof x === "string") {
      const k = parseInt(x.replace(/[^\d]/g, ""), 10);
      return Number.isFinite(k) ? k : null;
    }
    return null;
  })(v);

  return typeof n === "number" ? n : null;
}

export function extractConnections(node, cyInstance) {
  // 1) Prefer explicit numeric fields (if present)
  const candidates = [
    node?.connections,
    node?.degree,
    node?.degree_centrality,
    node?.num_connections,
  ];
  const value = candidates.find((v) => typeof v === "number" && Number.isFinite(v));
  if (value != null) return value.toLocaleString();

  // 2) Fallback: compute from Cytoscape (incident similarity edges preferred)
  try {
    const id = String(node?.id ?? "");
    if (!id || !cyInstance || cyInstance.destroyed?.()) return PLACEHOLDER;

    const n = cyInstance.$id(id);
    if (!n || n.empty?.()) return PLACEHOLDER;

    // Prefer similarity edges if present; otherwise count all incident edges
    const simEdges = n.connectedEdges('[type = "CROSS_TOPIC_SIMILARITY"]');
    const count = (simEdges?.length ?? 0) > 0 ? simEdges.length : (n.connectedEdges()?.length ?? 0);

    return count ? count.toLocaleString() : PLACEHOLDER;
  } catch {
    return PLACEHOLDER;
  }
}

export function extractCentrality(node, cyInstance) {
  // Centrality for HE_2025 is derived from graph structure:
  // - Prefer weighted similarity-strength (sum of edge scores) if present
  // - Else use similarity degree (count of similarity edges)
  // - Else fall back to total incident edge count
  //
  // Then normalize by graph max so it isn't identical to "Connections".

  try {
    const id = String(node?.id ?? "");
    if (!id || !cyInstance || cyInstance.destroyed?.()) return PLACEHOLDER;

    const n = cyInstance.$id(id);
    if (!n || n.empty?.()) return PLACEHOLDER;

    const simEdges = n.connectedEdges(
      '[type = "CROSS_TOPIC_SIMILARITY"], [category = "CROSS_TOPIC_SIMILARITY"]'
    );

    // ---- 1) Compute node "strength" ----
    let strength = 0;
    let hasAnyWeight = false;

    if (simEdges && simEdges.length > 0) {
      simEdges.forEach((e) => {
        // Be permissive about the weight key name
        const raw =
          e.data("score") ??
          e.data("weight") ??
          e.data("similarity") ??
          e.data("value");

        const w = raw == null ? NaN : parseFloat(String(raw));
        if (Number.isFinite(w)) {
          strength += w;
          hasAnyWeight = true;
        }
      });

      // Similarity edges exist but no numeric weights -> use similarity degree as proxy
      if (!hasAnyWeight) strength = simEdges.length;
    } else {
      // No similarity edges at all -> fall back to total incident edge count
      strength = n.connectedEdges()?.length ?? 0;
    }

    if (!strength) return PLACEHOLDER;

    // ---- 2) Normalize by graph max (cached in cy.scratch) ----
    const cacheKey = "he2025CentralityMax_v1";
    let maxStrength = cyInstance.scratch(cacheKey);

    if (!maxStrength) {
      let max = 0;

      cyInstance.nodes().forEach((nodeEl) => {
        const edges = nodeEl.connectedEdges(
          '[type = "CROSS_TOPIC_SIMILARITY"], [category = "CROSS_TOPIC_SIMILARITY"]'
        );

        let s = 0;
        let any = false;

        if (edges && edges.length > 0) {
          edges.forEach((e) => {
            const raw =
              e.data("score") ??
              e.data("weight") ??
              e.data("similarity") ??
              e.data("value");

            const w = raw == null ? NaN : parseFloat(String(raw));
            if (Number.isFinite(w)) {
              s += w;
              any = true;
            }
          });

          if (!any) s = edges.length;
        } else {
          s = nodeEl.connectedEdges()?.length ?? 0;
        }

        if (s > max) max = s;
      });

      maxStrength = max || 1;
      cyInstance.scratch(cacheKey, maxStrength);
    }

    const normalized = strength / (maxStrength || 1);
    return Number.isFinite(normalized) ? normalized.toFixed(2) : PLACEHOLDER;
  } catch {
    return PLACEHOLDER;
  }
}


export function extractTags(node) {
  const candidates = node?.related_topics || node?.tags || node?.themes;

  if (Array.isArray(candidates)) {
    return candidates.map((t) => String(t)).filter(Boolean).slice(0, 6);
  }

  if (typeof candidates === "string") {
    return candidates
      .split(/[;,]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  return [];
}
