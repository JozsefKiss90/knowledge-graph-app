import { PLACEHOLDER } from "./constants";

/**
 * Get first non-empty field from a node object.
 */
export const getFirstNonEmpty = (node, keys = []) => {
  if (!node) return null;
  for (const k of keys) {
    const v = node?.[k];
    if (v == null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    return v;
  }
  return null;
};

export const formatBaseValue = (v) => {
  if (v == null) return PLACEHOLDER;

  if (typeof v === "number" && Number.isFinite(v)) return String(v);

  if (typeof v === "string") {
    const s = v.trim();
    return s.length ? s : PLACEHOLDER;
  }

  if (Array.isArray(v)) {
    const joined = v.filter(Boolean).map(String).join(", ");
    return joined.length ? joined : PLACEHOLDER;
  }

  if (typeof v === "object") {
    const label =
      v?.label ??
      v?.name ??
      v?.title ??
      v?.value ??
      (typeof v?.toString === "function" ? v.toString() : "");
    const s = String(label ?? "").trim();
    return s.length ? s : PLACEHOLDER;
  }

  return PLACEHOLDER;
};

export const parseNumber = (text) => {
  if (text == null) return null;
  if (typeof text === "number" && Number.isFinite(text)) return text;
  if (!text) return null;
  const match = String(text).match(/(\d+[.,]?\d*)/);
  if (!match) return null;
  const num = parseFloat(match[1].replace(",", "."));
  return Number.isFinite(num) ? num : null;
};

export const formatCallFieldValue = (key, rawValue, node) => {
  if (key === "technology_readiness_level") {
    const v =
      rawValue ?? getFirstNonEmpty(node, ["technology_readiness_level", "trl", "technology_readiness"]);

    if (typeof v === "string" && v.trim().length > 0) {
      const trlMatch = v.match(/trl\s*(\d+)/i) || v.match(/(\d+)/);
      return trlMatch ? `TRL ${trlMatch[1]}` : PLACEHOLDER;
    }
    if (typeof v === "number" && Number.isFinite(v)) return `TRL ${v}`;
    return PLACEHOLDER;
  }

  if (["min_contribution", "max_contribution", "indicative_budget"].includes(key)) {
    let v = rawValue;
    if (key === "indicative_budget" && v == null) {
      v = getFirstNonEmpty(node, ["indicative_budget", "total_budget", "budget"]);
    }
    const num = parseNumber(v);
    return num != null ? `${num.toLocaleString()} million` : PLACEHOLDER;
  }

  return formatBaseValue(rawValue);
};
