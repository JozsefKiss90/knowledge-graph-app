import { PLACEHOLDER } from "./constants";
import { parseNumber } from "./callFields";

/**
 * Attempt to extract connections / centrality from varying node schemas.
 */
export const extractConnections = (node) => {
  const v =
    node?.connections ??
    node?.connection_count ??
    node?.n_connections ??
    node?.degree ??
    node?.metrics?.connections ??
    node?.metrics?.degree;

  const num = parseNumber(v);
  return num != null ? String(num) : PLACEHOLDER;
};

export const extractCentrality = (node) => {
  const v =
    node?.centrality ??
    node?.betweenness ??
    node?.pagerank ??
    node?.metrics?.centrality ??
    node?.metrics?.pagerank;

  const num = parseNumber(v);
  if (num == null) return PLACEHOLDER;
  return Number.isInteger(num) ? String(num) : num.toFixed(3);
};

export const extractTags = (node) => {
  const tags =
    node?.tags ??
    node?.topics ??
    node?.related_topics ??
    node?.metadata?.tags ??
    node?.metadata?.topics;

  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter(Boolean).map(String);
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

export const extractDestinationCallCount = (node) => {
  // Preferred explicit fields
  const v =
    node?.n_calls ??
    node?.calls_count ??
    node?.call_count ??
    node?.metrics?.n_calls ??
    node?.metrics?.calls;

  const num = parseNumber(v);
  if (num != null) return num;

  // Fallback: some datasets store aggregated counts differently
  const v2 = node?.num_calls ?? node?.calls ?? node?.total_calls;
  const num2 = parseNumber(v2);
  return num2 != null ? num2 : 0;
};
