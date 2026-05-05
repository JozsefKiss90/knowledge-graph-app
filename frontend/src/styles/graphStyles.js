// src/styles/graphStyles.js

export const groupColors = {
  meta: "#3B82F6",
  sp: "#F59E0B",
  pillar: "#A78BFA",
  programme: "#22C55E",
  destination: "#60A5FA",
  call: "#F59E0B",
};

/* ------------------------------------------------
   Responsive detection
------------------------------------------------ */

const vw = window.innerWidth || 0;
const vh = window.innerHeight || 0;

const shortestSide = Math.min(vw, vh);

const isTouchDevice =
  window.matchMedia?.("(pointer: coarse)")?.matches ||
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0;

const isMobile = isTouchDevice && shortestSide <= 900;

/* Label scaling */

const FONT_SCALE = isMobile ? 1.45 : 1;
const NODE_SCALE = isMobile ? 1.2 : 1;

const LABEL_MAX_WIDTH = isMobile ? 260 : 200;

/* ------------------------------------------------
   Color helpers
------------------------------------------------ */

function resolveNodeGroup(data) {
  if (!data) return null;

  if (data.group && groupColors[data.group]) return data.group;

  const type = String(data.type || data.category || "").toLowerCase();

  if (type.includes("meta") || type.includes("root")) return "meta";
  if (type.includes("sp")) return "sp";
  if (type.includes("pillar")) return "pillar";
  if (type.includes("programme") || type.includes("cluster")) return "programme";
  if (type.includes("destination")) return "destination";
  if (type.includes("call")) return "call";

  return null;
}

function resolveNodeColor(ele) {
  const data = ele?.data ? ele.data() : ele;
  const group = resolveNodeGroup(data);

  if (group && groupColors[group]) return groupColors[group];

  const themeColor = ele?.data ? ele.data("themeColor") : data?.themeColor;
  if (themeColor) return themeColor;

  return "#9CA3AF";
}

function resolveRootColor(ele, fallbackGroup) {
  const data = ele?.data ? ele.data() : ele;

  const explicit =
    (ele?.data &&
      (ele.data("themeRootColor") ||
        ele.data("themeClusterRootColor") ||
        ele.data("themeDestinationRootColor"))) ||
    data?.themeRootColor ||
    data?.themeClusterRootColor ||
    data?.themeDestinationRootColor;

  if (explicit) return explicit;
  if (fallbackGroup && groupColors[fallbackGroup]) return groupColors[fallbackGroup];

  return resolveNodeColor(ele);
}

function resolveLabelColor(ele) {
  return ele?.data?.("themeLabelColor") || "#F3F6FF";
}

function resolveEdgeColor(ele) {
  return ele?.data?.("themeEdgeColor") || "rgba(148,163,184,0.65)";
}

/* ------------------------------------------------
   Cytoscape stylesheet
------------------------------------------------ */

export const stylesheet = [
  {
    selector: "node",
    style: {
      label: "data(label)",

      "font-size": 10 * FONT_SCALE,
      "font-weight": 400,

      "text-valign": "bottom",
      "text-halign": "center",

      "text-wrap": "wrap",
      "text-max-width": LABEL_MAX_WIDTH,

      "text-margin-y": 8,

      color: (ele) => resolveLabelColor(ele),

      "text-outline-width": isMobile ? 2 : 0,
      "text-outline-color": "#000",

      width: 30 * NODE_SCALE,
      height: 30 * NODE_SCALE,

      "background-color": (ele) => resolveNodeColor(ele),

      "border-width": 2,
      "border-color": (ele) => resolveNodeColor(ele),
      "border-opacity": 0.65,

      "bounds-expansion": "6px 6px 24px 6px",
    },
  },

  {
    selector: "edge",
    style: {
      width: 0.8,
      "line-color": (ele) => resolveEdgeColor(ele),
      "curve-style": "straight",
      "target-arrow-shape": "none",
      "source-arrow-shape": "none",
      "overlay-opacity": 0,
    },
  },

  {
    selector: "node.as-root, node[type = 'root'], node[category = 'root']",
    style: {
      width: 42 * NODE_SCALE,
      height: 42 * NODE_SCALE,
      "font-size": 12 * FONT_SCALE,
      "font-weight": 700,
      "text-margin-y": 10,
      color: (ele) => resolveLabelColor(ele),
    },
  },

  {
    selector: "node[type = 'pillar'], node[category = 'pillar']",
    style: {
      width: 46 * NODE_SCALE,
      height: 46 * NODE_SCALE,
      "font-size": 10 * FONT_SCALE,
      "font-weight": 700,
      color: (ele) => resolveLabelColor(ele),
    },
  },

  {
    selector: "node[type = 'programme'], node[category = 'programme']",
    style: {
      width: 40 * NODE_SCALE,
      height: 40 * NODE_SCALE,
      "font-size": 10 * FONT_SCALE,
      "font-weight": 600,
      color: (ele) => resolveLabelColor(ele),
    },
  },

  {
    selector: "node[type = 'cluster'], node[category = 'cluster']",
    style: {
      width: 40 * NODE_SCALE,
      height: 40 * NODE_SCALE,
      "font-size": 10 * FONT_SCALE,
      "font-weight": 600,
      color: (ele) => resolveLabelColor(ele),
    },
  },

  {
    selector: "node[type = 'Destination'], node[category = 'Destination']",
    style: {
      width: 34 * NODE_SCALE,
      height: 34 * NODE_SCALE,
    },
  },

  {
    selector: "node[type = 'Call'], node[category = 'Call']",
    style: {
      width: 26 * NODE_SCALE,
      height: 26 * NODE_SCALE,
    },
  },

  { selector: "edge[type = 'SHARED_TOPIC']", style: { "line-style": "dashed" } },

  {
    selector: "edge[type = 'CROSS_TOPIC_SIMILARITY']",
    style: { "line-style": "dotted" },
  },

  {
    selector: ".is-hovered",
    style: {
      "font-weight": 700,
      "font-size": 10 * FONT_SCALE,
      color: (ele) => resolveLabelColor(ele),
    },
  },

  {
    selector: ".highlighted, .is-hovered",
    style: {
      "border-width": 2,
      "border-color": (ele) => resolveNodeColor(ele),
    },
  },

  {
    selector: "node.as-root",
    style: {
      "background-color": (ele) => resolveRootColor(ele, "meta"),
    },
  },

  {
    selector: "node.as-cluster-root",
    style: {
      "background-color": (ele) => resolveRootColor(ele, "programme"),
    },
  },

  {
    selector: "node.as-destination-root",
    style: {
      "background-color": (ele) => resolveRootColor(ele, "destination"),
    },
  },
];