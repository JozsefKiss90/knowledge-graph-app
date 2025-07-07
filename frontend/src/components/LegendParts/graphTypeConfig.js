export const defaultEdgeTypes = {
  HE_2025: new Set(['BELONGS_TO_TOPIC', 'SHARED_TOPIC', 'CROSS_TOPIC_SIMILARITY']),
  Cluster_4: new Set(['HAS_DESTINATION', 'HAS_THEME', 'HAS_CALL']),
  Cluster_2: new Set(['HAS_DESTINATION', 'HAS_THEME', 'HAS_CALL']),
};

export const defaultNodeTypes = {
  HE_2025: new Set(['policy', 'strategy', 'cluster', 'research_theme', 'institution', 'topic']),
  Cluster_4: new Set(['Work Programme', 'Destination', 'Theme', 'Call']),
  Cluster_2: new Set(['Work Programme', 'Destination', 'Theme', 'Call']),
};

export const getEdgeTypeList = (graphName) => {
  const clean = graphName.replace("_cose", "");
  if (clean === "HE_2025") {
    return [
      { type: 'BELONGS_TO_TOPIC', color: 'rgb(0, 175, 140)' },
      { type: 'SHARED_TOPIC', color: 'rgb(70, 149, 252)' },
      { type: 'CROSS_TOPIC_SIMILARITY', color: 'rgb(223, 182, 70)' },
    ];
  } else if (clean === "Cluster_2") {
    return [
      { type: 'HAS_DESTINATION', color: 'rgb(92, 160, 250)' },
      { type: 'HAS_THEME', color: 'rgb(92, 123, 224)' },
      { type: 'HAS_CALL', color: 'rgb(221, 181, 102)' },
    ];
  } else {
    return [
      { type: 'HAS_DESTINATION', color: 'rgb(96, 163, 250)' },
      { type: 'HAS_THEME', color: 'rgb(87, 115, 209)' },
      { type: 'HAS_CALL', color: 'rgb(223, 180, 93)' },
    ];
  }
};

export const getNodeTypeList = (graphName) => {
  const clean = graphName.replace("_cose", "");
  if (clean === "HE_2025") {
    return [
      { type: 'policy', color: 'rgb(1, 173, 196)' },
      { type: 'strategy', color: 'rgb(64, 180, 116)' },
      { type: 'cluster', color: 'rgb(197, 91, 67)' },
      { type: 'research_theme', color: 'rgb(180, 143, 47)' },
      { type: 'institution', color: 'rgb(118, 46, 160)' },
      { type: 'topic', color: 'rgb(182, 182, 47)' },
    ];
  } else if (clean === "Cluster_2") {
    return [
      { type: 'Work Programme', color: 'rgb(197, 92, 69)' },
      { type: 'Destination', color: 'rgb(120, 175, 235)' },
      { type: 'Theme', color: 'rgb(88, 117, 212)' },
      { type: 'Call', color: 'rgb(214, 176, 99)' },
    ];
  } else {
    return [
      { type: 'Work Programme', color: 'rgb(196, 96, 74)' },
      { type: 'Destination', color: 'rgb(98, 170, 247)' },
      { type: 'Theme', color: 'rgb(86, 119, 226)' },
      { type: 'Call', color: 'rgb(223, 180, 94)' },
    ];
  }
};
