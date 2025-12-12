// src/components/utils/layoutConfig.js

// One uniform default (ROOT + clusters)
const UNIFORM_DEFAULT = {
  name: "cose-bilkent",
  fit: true,
  padding: 60,
  randomize: true,
  animate: "end",
  animationDuration: 400,
  nodeDimensionsIncludeLabels: false,
  quality: "default",
  nodeRepulsion: 12000,
  idealEdgeLength: 140,
  edgeElasticity: 0.2,
  gravity: 0.3,
  numIter: 10000,
  tile: true,
  tilingPaddingVertical: 16,
  tilingPaddingHorizontal: 16,
};

// Keep SP (HE_2025) separate — you can tune it as before
const HE_2025_PRESET = {
  name: "cose-bilkent",
  fit: true,
  padding: 50,
  randomize: false,
  animate: false,
  nodeDimensionsIncludeLabels: false,
  quality: "proof",
  nodeRepulsion: 25000,
  idealEdgeLength: 170,
  edgeElasticity: 0.1,
  gravity: 0.4,
  numIter: 20000,
  tile: true,
  tilingPaddingVertical: 10,
  tilingPaddingHorizontal: 10,
};

const TREE_DEFAULT = {
  name: "breadthfirst",
  fit: true,
  directed: true,
  padding: 80,
  spacingFactor: 1.1,
  avoidOverlap: true,
  animate: "end",
  animationDuration: 400,
  nodeDimensionsIncludeLabels: true,
};

export const layoutConfig = {
  DEFAULT: UNIFORM_DEFAULT,      // force-directed for ROOT + clusters
  DEFAULT_TREE: TREE_DEFAULT,    // hierarchical/tree for all non-HE_2025 graphs
  HE_2025: HE_2025_PRESET,       // Strategic Plan (single layout)
};

