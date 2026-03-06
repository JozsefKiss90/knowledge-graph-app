// src/styles/graphStyles.js

// -----------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH FOR GRAPH COLORS (MATCHES GRAPH SELECTOR)
// -----------------------------------------------------------------------------
export const groupColors = {
  meta: "#3B82F6",
  sp: "#F59E0B",
  pillar: "#A78BFA",
  programme: "#22C55E",
  destination: "#60A5FA",
  call: "#F59E0B",
};

// -----------------------------------------------------------------------------
// GROUP + COLOR RESOLUTION (NON-DESTRUCTIVE)
// -----------------------------------------------------------------------------
function resolveNodeGroup(data) {
  if (!data) return null;

  // explicit group wins
  if (data.group && groupColors[data.group]) return data.group;

  // infer from type/category
  const type = String(data.type || data.category || "").toLowerCase();

  if (type.includes("meta") || type.includes("root")) return "meta";
  if (type.includes("sp")) return "sp";
  if (type.includes("pillar")) return "pillar";
  if (type.includes("programme") || type.includes("cluster")) return "programme";
  if (type.includes("destination")) return "destination";
  if (type.includes("call")) return "call";

  return null;
}

/**
 * Resolve a node color WITHOUT changing any other style rules.
 * Priority:
 *  1) groupColors mapping (by group/type/category inference)
 *  2) existing data(themeColor) if present (to avoid breaking theming)
 *  3) fallback grey
 */
function resolveNodeColor(ele) {
  const data = ele?.data ? ele.data() : ele;
  const group = resolveNodeGroup(data);

  if (group && groupColors[group]) return groupColors[group];

  // keep backwards compatibility if some nodes already get themeColor assigned elsewhere
  const themeColor = ele?.data ? ele.data("themeColor") : data?.themeColor;
  if (themeColor) return themeColor;

  return "#9CA3AF";
}

/**
 * Root variants: keep your existing "as-root / as-cluster-root / as-destination-root"
 * overrides, but ensure they also stay aligned to the palette if themeRootColor isn't set.
 */
function resolveRootColor(ele, fallbackGroup) {
  const data = ele?.data ? ele.data() : ele;
  const explicit =
    (ele?.data && (ele.data("themeRootColor") || ele.data("themeClusterRootColor") || ele.data("themeDestinationRootColor"))) ||
    data?.themeRootColor ||
    data?.themeClusterRootColor ||
    data?.themeDestinationRootColor;

  if (explicit) return explicit;

  if (fallbackGroup && groupColors[fallbackGroup]) return groupColors[fallbackGroup];

  return resolveNodeColor(ele);
}

// -----------------------------------------------------------------------------
// OPTIONAL LEGACY EXPORT (if something imports graphStyles)
// Keep it aligned to the real stylesheet below, not a reduced version.
// -----------------------------------------------------------------------------
export const graphStyles = [
  {
    selector: "node",
    style: {
      // ONLY color resolution here; do not redefine layout/typography in this legacy export
      "background-color": (ele) => resolveNodeColor(ele),
      "border-color": (ele) => resolveNodeColor(ele),
      "shadow-color": (ele) => resolveNodeColor(ele),
    },
  },
];

// -----------------------------------------------------------------------------
// MAIN CYTOSCAPE STYLESHEET (PRESERVE YOUR EXISTING VISUALS)
// Only swap the color fields to use resolveNodeColor.
// -----------------------------------------------------------------------------
export const stylesheet = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "font-size": 10,
      "font-weight": 400,
      "text-valign": "bottom",
      "text-halign": "center",
      "text-wrap": "wrap",
      "text-max-width": 200,
      "text-margin-y": 8,
      color: "data(themeLabelColor)",
      "text-outline-width": 0,

      // KEEP SIZES AS YOU HAD THEM
      width: 30,
      height: 30,

      // ✅ ONLY CHANGE: node color fields now map to groupColors (fallback to themeColor)
      "background-color": (ele) => resolveNodeColor(ele),

      "border-width": 2,
      "border-color": (ele) => resolveNodeColor(ele),
      "border-opacity": 0.65,

      "shadow-offset-x": 0,
      "shadow-offset-y": 0,
      "shadow-blur": 18,
      "shadow-opacity": 0.55,
      "shadow-color": (ele) => resolveNodeColor(ele),

      "bounds-expansion": "6px 6px 24px 6px",
    },
  },

  {
    selector: "edge",
    style: {
      width: 0.8,
      "line-color": "data(themeEdgeColor)",
      "curve-style": "straight",
      "target-arrow-shape": "none",
      "source-arrow-shape": "none",
      "overlay-opacity": 0,
    },
  },

  // Root
  {
    selector: "node.as-root, node[type = 'root'], node[category = 'root']",
    style: {
      "font-size": 12,
      "font-weight": 700,
      "text-margin-y": 10,
    },
  },

  // Pillar + Programme (synthetic navigation layers)
  {
    selector: "node[type = 'pillar'], node[category = 'pillar']",
    style: { width: 46, height: 46, "font-size": 10, "font-weight": 700 },
  },
  {
    selector: "node[type = 'programme'], node[category = 'programme']",
    style: { width: 40, height: 40, "font-size": 10, "font-weight": 650, color: "#fff" },
  },

  // Existing programme graphs (real datasets)
  {
    selector: "node[type = 'cluster'], node[category = 'cluster']",
    style: { width: 40, height: 40, "font-size": 10, "font-weight": 600 },
  },
  {
    selector: "node[type = 'Destination'], node[category = 'Destination']",
    style: { width: 34, height: 34 },
  },
  {
    selector: "node[type = 'Call'], node[category = 'Call']",
    style: { width: 26, height: 26 },
  },

  { selector: "edge[type = 'SHARED_TOPIC']", style: { "line-style": "dashed" } },
  { selector: "edge[type = 'CROSS_TOPIC_SIMILARITY']", style: { "line-style": "dotted" } },

  {
    selector: ".is-hovered",
    style: {
      "font-weight": 700,
      "font-size": 10,
      color: "data(themeLabelColor)",
    },
  },

  {
    selector: ".highlighted, .is-hovered",
    style: {
      "border-width": 2,
      "border-color": (ele) => resolveNodeColor(ele),

      "shadow-blur": 16,
      "shadow-opacity": 0.42,
      "shadow-color": (ele) => resolveNodeColor(ele),
    },
  },

  // Root special classes: keep your structure, but align color if theme* not set
  {
    selector: "node.as-root",
    style: {
      "background-color": (ele) => resolveRootColor(ele, "meta"),
      "shadow-color": (ele) => resolveRootColor(ele, "meta"),
      "shadow-blur": 14,
      "shadow-opacity": 0.38,
    },
  },
  {
    selector: "node.as-cluster-root",
    style: {
      "background-color": (ele) => resolveRootColor(ele, "programme"),
      "shadow-color": (ele) => resolveRootColor(ele, "programme"),
      "shadow-blur": 14,
      "shadow-opacity": 0.38,
    },
  },
  {
    selector: "node.as-destination-root",
    style: {
      "background-color": (ele) => resolveRootColor(ele, "destination"),
      "shadow-color": (ele) => resolveRootColor(ele, "destination"),
      "shadow-blur": 14,
      "shadow-opacity": 0.38,
    },
  },
];