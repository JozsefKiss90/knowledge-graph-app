// src/styles/graphStyles.js

export const stylesheet = [
  // Base node – compact circle with label BELOW the node
{
  selector: "node",
  style: {
    label: "data(label)",
    // ↓ smaller label (3–4 “points” down)
    "font-size": 6,
    "font-weight": 400,
    "text-valign": "bottom",
    "text-halign": "center",
    "text-wrap": "wrap",
    "text-max-width": 90,
    "text-margin-y": 8,           // slightly more spacing under the node
    color: "#f9fafb",
    "text-outline-width": 0,
    "background-color": "#6b8afd",
    width: 30,
    height: 30,
    "border-width": 1,
    "border-color": "rgba(15,23,42,0.45)",
    "overlay-opacity": 0,

    // NEW: make the node’s hit-area larger so the *label* is hoverable/clickable
    "bounds-expansion": "4px 4px 18px 4px",
    // top  right   bottom  left – bottom is larger to cover the title below the node
  },
},

  // Base edge – thin, no arrows, subtle colour
  {
    selector: "edge",
    style: {
      width: 0.8,
      "line-color": "rgba(148,163,184,0.7)",
      "curve-style": "straight",
      "target-arrow-shape": "none",
      "source-arrow-shape": "none",
      "overlay-opacity": 0,
    },
  },

  // NODE TYPES (match legend colours, slightly refined)
  {
    selector: "node[type = 'policy'], node[category = 'policy']",
    style: { "background-color": "rgb(1, 173, 196)" },
  },
  {
    selector: "node[type = 'strategy'], node[category = 'strategy']",
    style: { "background-color": "rgb(64, 180, 116)" },
  },
  {
    selector: "node[type = 'cluster'], node[category = 'cluster']",
    style: {
      "background-color": "rgb(197, 91, 67)",
      width: 40,
      height: 40,
      "font-size": 10,
      "font-weight": 600,
    },
  },
  {
    selector:
      "node[type = 'research_theme'], node[category = 'research_theme']",
    style: { "background-color": "rgb(180, 143, 47)" },
  },
  {
    selector:
      "node[type = 'institution'], node[category = 'institution']",
    style: { "background-color": "rgb(118, 46, 160)" },
  },
  {
    selector: "node[type = 'topic'], node[category = 'topic']",
    style: { "background-color": "rgb(182, 182, 47)" },
  },

  // Destination & Call (cluster graphs)
  {
    selector: "node[type = 'Destination'], node[category = 'Destination']",
    style: { "background-color": "rgb(98, 170, 247)", width: 34, height: 34 },
  },
  {
    selector: "node[type = 'Call'], node[category = 'Call']",
    style: { "background-color": "rgb(223, 180, 94)", width: 26, height: 26 },
  },

  // Call visibility toggles
  { selector: "node.call-hidden, edge.call-hidden", style: { display: "none" } },
  {
    selector: "node.call-visible, edge.call-visible",
    style: { display: "element" },
  },

  // EDGE TYPES (only colour, no arrows)
  {
    selector: "edge[type = 'BELONGS_TO_TOPIC']",
    style: { "line-color": "rgb(0, 175, 140)" },
  },
  {
    selector: "edge[type = 'SHARED_TOPIC']",
    style: {
      "line-style": "dashed",
      "line-color": "rgb(70, 149, 252)",
    },
  },
  {
    selector: "edge[type = 'CROSS_TOPIC_SIMILARITY']",
    style: {
      "line-style": "dotted",
      "line-color": "rgb(223, 182, 70)",
    },
  },
  {
    selector: "edge[type = 'HAS_DESTINATION']",
    style: { "line-color": "rgb(96, 163, 250)" },
  },
  {
    selector: "edge[type = 'HAS_CALL']",
    style: { "line-color": "rgb(223, 180, 93)" },
  },

  // Fading + highlighting
  { selector: ".faded", style: { opacity: 0.16 } },
  {
    selector: ".highlighted",
    style: {
      opacity: 1,
      "border-width": 1.5,
      "border-color": "#ffffff",
      "border-opacity": 0.9,
    },
  },

  // The *hovered* node: bold label, a bit larger
  {
    selector: ".is-hovered",
    style: {
      "font-weight": 700,
      "font-size": 8,
      color: "#ffffff",
    },
  },
];
