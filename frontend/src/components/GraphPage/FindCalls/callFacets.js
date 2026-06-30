// src/components/GraphPage/FindCalls/callFacets.js
//
// Tier 3.3 — pure facet logic for the unified "Find calls" workspace.
// No React / DOM here, so it stays trivially testable and reusable.

export const STATUS_LABELS = {
  open: "Open",
  upcoming: "Upcoming",
  closed: "Closed",
  unknown: "Undated",
};
export const STATUS_ORDER = ["open", "upcoming", "closed", "unknown"];

// Display order for normalised action-type codes.
export const ACTION_TYPE_ORDER = [
  "RIA",
  "IA",
  "CSA",
  "COFUND",
  "ERC",
  "MSCA",
  "EIC",
  "Prize",
  "Other",
  "Unknown",
];

/**
 * Normalise the verbose `type_of_action` string to a short facet code.
 * The corpus is heterogeneous: some sources store the code form
 * ("HORIZON-RIA HORIZON Research and Innovation Actions") while clusters CL3–CL6
 * store the SPELLED-OUT name only ("Research and Innovation Actions"), so each
 * code token is matched alongside its spelled-out alternative. Order matters:
 * "Research and Innovation Actions" must hit RIA before the IA check (it also
 * contains "Innovation Action…"). Returns null when there's no value.
 */
export function normalizeActionType(raw) {
  const s = String(raw || "").toUpperCase();
  if (!s.trim()) return null;
  if (/COFUND/.test(s)) return "COFUND";
  if (/\bCSA\b|COORDINATION AND SUPPORT/.test(s)) return "CSA";
  if (/\bRIA\b|RESEARCH AND INNOVATION/.test(s)) return "RIA";
  if (/\bIA\b|INNOVATION ACTION/.test(s)) return "IA";
  if (/\bERC\b|EUROPEAN RESEARCH COUNCIL/.test(s)) return "ERC";
  if (/\bMSCA\b|MARIE\s*S/.test(s)) return "MSCA";
  if (/\bEIC\b/.test(s)) return "EIC";
  if (/PRIZE|INDUCEMENT/.test(s)) return "Prize";
  return "Other";
}

/** Parse a call's indicative budget to a number (0 when absent/unparseable). */
export function parseBudget(d) {
  const raw = d?.indicative_budget ?? d?.total_budget ?? d?.budget;
  if (raw == null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export const BUDGET_BUCKETS = [
  { key: "lt2", label: "< €2M" },
  { key: "2to10", label: "€2–10M" },
  { key: "10to50", label: "€10–50M" },
  { key: "gte50", label: "≥ €50M" },
  { key: "none", label: "Not specified" },
];
export const BUDGET_BUCKET_ORDER = BUDGET_BUCKETS.map((b) => b.key);
export const BUDGET_BUCKET_LABELS = Object.fromEntries(
  BUDGET_BUCKETS.map((b) => [b.key, b.label])
);

export function budgetBucketKey(b) {
  if (!b || b <= 0) return "none";
  if (b < 2e6) return "lt2";
  if (b < 10e6) return "2to10";
  if (b < 50e6) return "10to50";
  return "gte50";
}

/** Status from parsed open/close dates vs now — mirrors useDashboardData. */
export function computeStatus(openDate, closeDate, now = new Date()) {
  if (!openDate && !closeDate) return "unknown";
  if (closeDate && closeDate < now) return "closed";
  if (openDate && openDate <= now && (!closeDate || closeDate >= now)) return "open";
  if (openDate && openDate > now) return "upcoming";
  if (closeDate && closeDate >= now) return "open";
  return "unknown";
}

// Facet groups: { key, label, gated?, values(call) -> string[] }.
export const FACET_GROUPS = [
  { key: "status", label: "Status", values: (c) => [c.status] },
  { key: "programmeKey", label: "Programme", values: (c) => [c.programmeKey] },
  { key: "typeOfAction", label: "Action type", values: (c) => [c.typeOfAction || "Unknown"] },
  { key: "year", label: "Deadline year", values: (c) => (c.year ? [String(c.year)] : ["—"]) },
  { key: "budgetBucket", label: "Budget", values: (c) => [c.budgetBucket] },
  {
    key: "tags",
    label: "Research field (CORDIS)",
    gated: true,
    values: (c) => c.tags || [],
  },
];

function textTokens(text) {
  return String(text || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function callMatchesText(call, tokens) {
  if (!tokens.length) return true;
  const hay = `${call.label} ${call.id} ${(call.tags || []).join(" ")}`.toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

/**
 * Filter calls by the selected facet values (AND across groups, OR within a
 * group) plus a free-text query.
 * @param {Array} calls
 * @param {Object<string, Set<string>>} selected
 * @param {string} text
 */
export function filterCalls(calls, selected, text) {
  const tokens = textTokens(text);
  return calls.filter((c) => {
    if (!callMatchesText(c, tokens)) return false;
    for (const g of FACET_GROUPS) {
      const sel = selected[g.key];
      if (!sel || sel.size === 0) continue;
      const vals = g.values(c);
      if (!vals.some((v) => sel.has(v))) return false;
    }
    return true;
  });
}

export function anyFacetActive(selected, text) {
  if (String(text || "").trim()) return true;
  return FACET_GROUPS.some((g) => selected[g.key]?.size > 0);
}

/** Human-readable summary of the active facets (drives the constraint-bar pill). */
export function facetSummary(selected, text) {
  const parts = [];
  const t = String(text || "").trim();
  if (t) parts.push(`"${t}"`);
  for (const g of FACET_GROUPS) {
    const sel = selected[g.key];
    if (sel?.size) parts.push(Array.from(sel).slice(0, 4).join("/"));
  }
  return parts.join(" · ");
}

/** Count of calls per value for one facet group: Map<value, count>. */
export function facetCounts(calls, groupKey) {
  const g = FACET_GROUPS.find((x) => x.key === groupKey);
  const counts = new Map();
  if (!g) return counts;
  for (const c of calls) {
    for (const v of g.values(c)) {
      if (v == null || v === "") continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
  }
  return counts;
}

/** Order a facet group's values for display. */
export function orderFacetValues(groupKey, counts) {
  const entries = Array.from(counts.entries());
  if (groupKey === "status") {
    return entries.sort(
      (a, b) => STATUS_ORDER.indexOf(a[0]) - STATUS_ORDER.indexOf(b[0])
    );
  }
  if (groupKey === "typeOfAction") {
    return entries.sort(
      (a, b) => ACTION_TYPE_ORDER.indexOf(a[0]) - ACTION_TYPE_ORDER.indexOf(b[0])
    );
  }
  if (groupKey === "budgetBucket") {
    return entries.sort(
      (a, b) => BUDGET_BUCKET_ORDER.indexOf(a[0]) - BUDGET_BUCKET_ORDER.indexOf(b[0])
    );
  }
  if (groupKey === "year") {
    // Newest first, the "—" (undated) bucket last.
    return entries.sort((a, b) => {
      if (a[0] === "—") return 1;
      if (b[0] === "—") return -1;
      return Number(b[0]) - Number(a[0]);
    });
  }
  // programme / tags / fallback: by count desc, then label.
  return entries.sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}
