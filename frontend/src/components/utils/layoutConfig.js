const isMobile = window.innerWidth <= 900;

const UNIFORM_DEFAULT = {
  name: "cose-bilkent",
  fit: true,
  padding: isMobile ? 10 : 60,
  randomize: true,
  animate: "end",
  animationDuration: 400,
  nodeDimensionsIncludeLabels: false,
  quality: "default",
  nodeRepulsion: isMobile ? 2000 : 12000,
  idealEdgeLength: isMobile ? 40 : 140,
  edgeElasticity: 0.2,
  gravity: isMobile ? 1 : 0.3,
  numIter: 10000,
  tile: true,
  tilingPaddingVertical: isMobile ? 5 : 16,
  tilingPaddingHorizontal: isMobile ? 5 : 16,
};

const HE_2025_PRESET = {
  name: "cose-bilkent",
  fit: true,
  padding: isMobile ? 20 : 60,
  randomize: false,
  animate: false,
  nodeDimensionsIncludeLabels: false,
  quality: "proof",
  nodeRepulsion: isMobile ? 20000 : 65000,
  idealEdgeLength: isMobile ? 150 : 320,
  edgeElasticity: 0.45,
  gravity: isMobile ? 0.40 : 0.12,
  numIter: 25000,
  tile: true,
  tilingPaddingVertical: isMobile ? 5 : 18,
  tilingPaddingHorizontal: isMobile ? 5 : 18,
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

