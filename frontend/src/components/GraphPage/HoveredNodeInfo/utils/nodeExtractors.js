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

export function extractConnections(node) {
  const candidates = [
    node?.connections,
    node?.degree,
    node?.degree_centrality,
    node?.num_connections,
  ];
  const value = candidates.find((v) => typeof v === "number" && Number.isFinite(v));
  return value != null ? value.toLocaleString() : PLACEHOLDER;
}

export function extractCentrality(node) {
  const candidates = [node?.centrality, node?.betweenness, node?.closeness, node?.eigenvector];
  const value = candidates.find((v) => typeof v === "number" && Number.isFinite(v));
  if (value == null) return PLACEHOLDER;
  return value.toFixed(2);
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
