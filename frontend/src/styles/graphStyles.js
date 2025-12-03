// graphStyles.js
// Cytoscape stylesheet with progressive disclosure for Calls.

export const stylesheet = [
  // base
  {
    selector: "node",
    style: {
      label: "data(label)",
      "font-size": 10,
      "text-valign": "center",
      "text-halign": "center",
      "text-wrap": "wrap",
      "text-max-width": 120,
      "background-color": "#6b8afd",
      width: "36px",
      height: "36px",
      color: "#111",
      "overlay-opacity": 0,
    },
  },
  {
    selector: "edge",
    style: {
      width: 1.5,
      "line-color": "rgba(120,120,140,0.5)",
      "target-arrow-color": "rgba(120,120,140,0.5)",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      "overlay-opacity": 0,
    },
  },

  // cluster
  {
    selector: "node[type = 'cluster'], node[category = 'cluster']",
    style: {
      "background-color": "#7dd3fc",
      "font-size": 12,
      "font-weight": "bold",
      width: "48px",
      height: "48px",
    },
  },

  // destination
  {
    selector: "node[type = 'Destination'], node[category = 'Destination']",
    style: {
      "background-color": "#34d399",
      width: "40px",
      height: "40px",
    },
  },

  // call (hidden by default; controller sets .call-hidden on load)
  {
    selector: "node[type = 'Call'], node[category = 'Call']",
    style: {
      "background-color": "#fbbf24",
      width: "32px",
      height: "32px",
    },
  },
  { selector: "node.call-hidden", style: { display: "none" } },
  { selector: "edge.call-hidden", style: { display: "none" } },
  { selector: "node.call-visible", style: { display: "element" } },
  { selector: "edge.call-visible", style: { display: "element" } },

  // hover emphasis (you can set these classes from outside if desired)
  {
    selector: "node.hovered",
    style: {
      "border-color": "#111827",
      "border-width": 2,
      "border-opacity": 0.6,
    },
  },
  {
    selector: "edge.em",
    style: {
      width: 2.5,
      "line-color": "#94a3b8",
      "target-arrow-color": "#94a3b8",
    },
  },
];
