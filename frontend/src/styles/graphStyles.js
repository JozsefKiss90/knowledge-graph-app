// src/styles/graphStyles.js
export const stylesheet = [
  // Base node
  {
    selector: "node",
    style: {
      label: "data(label)",
      "font-size": 8,
      "text-valign": "center",
      "text-halign": "center",
      "text-wrap": "wrap",
      "text-max-width": 100,
      color: "#ffffff",
      "text-outline-color": "rgba(0,0,0,0.35)",
      "text-outline-width": 2,
      "background-color": "#6b8afd",
      width: 32,
      height: 32,
      "overlay-opacity": 0,
    },
  },
  // Base edge
  {
    selector: "edge",
    style: {
      width: 1.5,
      "line-color": "rgba(120,120,140,0.45)",
      "target-arrow-color": "rgba(120,120,140,0.45)",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      "overlay-opacity": 0,
    },
  },

  // NODE TYPES (match Legend colours)
  { selector: "node[type = 'policy'], node[category = 'policy']",                 style: { "background-color": "rgb(1, 173, 196)" } },
  { selector: "node[type = 'strategy'], node[category = 'strategy']",             style: { "background-color": "rgb(64, 180, 116)" } },
  { selector: "node[type = 'cluster'], node[category = 'cluster']",               style: { "background-color": "rgb(197, 91, 67)", width: 44, height: 44, "font-size": 10, "font-weight": 700 } },
  { selector: "node[type = 'research_theme'], node[category = 'research_theme']", style: { "background-color": "rgb(180, 143, 47)" } },
  { selector: "node[type = 'institution'], node[category = 'institution']",       style: { "background-color": "rgb(118, 46, 160)" } },
  { selector: "node[type = 'topic'], node[category = 'topic']",                   style: { "background-color": "rgb(182, 182, 47)" } },

  // Destination & Call (cluster graphs)
  { selector: "node[type = 'Destination'], node[category = 'Destination']", style: { "background-color": "rgb(98, 170, 247)", width: 38, height: 38 } },
  { selector: "node[type = 'Call'], node[category = 'Call']",               style: { "background-color": "rgb(223, 180, 94)",  width: 28, height: 28 } },

  // Call visibility toggles
  { selector: "node.call-hidden, edge.call-hidden",  style: { display: "none" } },
  { selector: "node.call-visible, edge.call-visible",style: { display: "element" } },

  // EDGE TYPES (match Legend)
  { selector: "edge[type = 'BELONGS_TO_TOPIC']",      style: { "line-color": "rgb(0, 175, 140)", "target-arrow-color": "rgb(0, 175, 140)" } },
  { selector: "edge[type = 'SHARED_TOPIC']",          style: { "line-style": "dashed", "line-color": "rgb(70, 149, 252)", "target-arrow-color": "rgb(70, 149, 252)" } },
  { selector: "edge[type = 'CROSS_TOPIC_SIMILARITY']",style: { "line-style": "dotted", "line-color": "rgb(223, 182, 70)", "target-arrow-color": "rgb(223, 182, 70)" } },
  { selector: "edge[type = 'HAS_DESTINATION']",       style: { "line-color": "rgb(96, 163, 250)", "target-arrow-color": "rgb(96, 163, 250)" } },
  { selector: "edge[type = 'HAS_CALL']",              style: { "line-color": "rgb(223, 180, 93)", "target-arrow-color": "rgb(223, 180, 93)" } },

  // Highlighting + fading
  { selector: ".faded",       style: { opacity: 0.16 } },
  { selector: ".highlighted", style: { "border-width": 2, "border-color": "#fff", "border-opacity": 0.9, opacity: 1 } },
];
