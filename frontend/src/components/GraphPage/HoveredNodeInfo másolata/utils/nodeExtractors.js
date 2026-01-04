import { PLACEHOLDER } from "./constants";

export function extractDestinationCallCount(node) {
  const direct =
    node?.call_count ??
    node?.calls_count ??
    node?.callsCount ??
    node?.num_calls ??
    node?.callCount;

  if (typeof direct === "number" && Number.isFinite(direct)) return direct;

  // If it is missing, return null (so UI does not show a misleading 0)
  return null;
}

export function extractClusterDestinationCount(node) {
  const direct =
    node?.destination_count ??
    node?.destinations_count ??
    node?.destinationCount ??
    node?.destinationsCount ??
    node?.num_destinations ??
    node?.n_destinations;

  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  return null;
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
  return Number(value).toFixed(2);
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
