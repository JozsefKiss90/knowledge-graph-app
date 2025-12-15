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
      // make a neon ring
    "border-width": 2,
    "border-color": "data(themeColor)",
    "border-opacity": 0.65,

    // stronger always-on glow
    "shadow-offset-x": 0,
    "shadow-offset-y": 0,
    "shadow-blur": 18,
    "shadow-opacity": 0.55,
    "shadow-color": "data(themeColor)",

    // ensure the shadow isn't clipped
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

  {
  selector: ".highlighted, .is-hovered",
  style: {
    "border-width": 2,
    "border-color": "data(themeColor)",

    "shadow-blur": 16,
    "shadow-opacity": 0.42,
    "shadow-color": "data(themeColor)",
  },
},

{
  selector: "node.as-root",
  style: {
    "background-color": "data(themeRootColor)",
    "shadow-color": "data(themeRootColor)",
    "shadow-blur": 14,
    "shadow-opacity": 0.38,
  },
},
{
  selector: "node.as-cluster-root",
  style: {
    "background-color": "data(themeClusterRootColor)",
    "shadow-color": "data(themeClusterRootColor)",
    "shadow-blur": 14,
    "shadow-opacity": 0.38,
  },
},
{
  selector: "node.as-destination-root",
  style: {
    "background-color": "data(themeDestinationRootColor)",
    "shadow-color": "data(themeDestinationRootColor)",
    "shadow-blur": 14,
    "shadow-opacity": 0.38,
  },
},

];
