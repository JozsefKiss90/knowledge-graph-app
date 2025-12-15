// src/styles/graphStyles.js

export const stylesheet = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "font-size": 6,
      "font-weight": 400,
      "text-valign": "bottom",
      "text-halign": "center",
      "text-wrap": "wrap",
      "text-max-width": 90,
      "text-margin-y": 8,
      color: "data(themeLabelColor)",
      "text-outline-width": 0,
      "background-color": "data(themeColor)",
      width: 30,
      height: 30,
      "border-width": 1,
      "border-color": "data(themeBorderColor)",
      "overlay-opacity": 0,
      "bounds-expansion": "4px 4px 18px 4px",
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

  // NODE TYPE sizing only (colour comes from data(themeColor))
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

  // EDGE TYPE line-style only (colour comes from data(themeEdgeColor))
  { selector: "edge[type = 'SHARED_TOPIC']", style: { "line-style": "dashed" } },
  {
    selector: "edge[type = 'CROSS_TOPIC_SIMILARITY']",
    style: { "line-style": "dotted" },
  },

  {
    selector: ".is-hovered",
    style: {
      "font-weight": 700,
      "font-size": 8,
      color: "data(themeLabelColor)",
    },
  },
];
