export const defaultEdgeTypes = {
  HE_2025: new Set(['RELATES_TO', 'WIKI_LINK']),
  Cluster_4: new Set(['HAS_DESTINATION', 'HAS_CALL']),
  Cluster_2: new Set(['HAS_DESTINATION', 'HAS_CALL']),
  Cluster_3: new Set(['HAS_DESTINATION', 'HAS_CALL']),
  Cluster_1: new Set(['HAS_DESTINATION', 'HAS_CALL']),
  Cluster_5: new Set(['HAS_DESTINATION', 'HAS_CALL']),
  Cluster_6: new Set(['HAS_DESTINATION', 'HAS_CALL']),
};

export const defaultNodeTypes = {
  HE_2025: new Set(['policy', 'strategy', 'cluster', 'research_theme', 'institution', 'topic', 'synthesis']),
  // Cluster views – start with Destination only
  Cluster_4: new Set(['Destination']),
  Cluster_2: new Set(['Destination']),
  Cluster_3: new Set(['Destination']),
  Cluster_1: new Set(['Destination']),
  Cluster_5: new Set(['Destination']),
  Cluster_6: new Set(['Destination']),
};


export const getEdgeTypeList = (graphName) => {
  const clean = graphName.replace("_cose", "");
  if (clean === "HE_2025") {
    return [
      { type: 'RELATES_TO', color: 'rgb(0, 175, 140)' },
      { type: 'WIKI_LINK', color: 'rgb(70, 149, 252)' },
    ];
  } else if (clean === "Cluster_2") {
    return [
      { type: 'HAS_DESTINATION', color: 'rgb(92, 160, 250)' },
      { type: 'HAS_CALL', color: 'rgb(221, 181, 102)' },
    ];
  } else {
    return [
      { type: 'HAS_DESTINATION', color: 'rgb(96, 163, 250)' },
      { type: 'HAS_CALL', color: 'rgb(223, 180, 93)' },
    ];
  }
};

export const getNodeTypeList = (graphName) => {
  const clean = graphName.replace("_cose", "");
  if (clean === "HE_2025") {
    return [
      { type: 'policy', color: 'rgb(34, 211, 238)' },
      { type: 'strategy', color: 'rgb(52, 211, 153)' },
      { type: 'cluster', color: 'rgb(163, 230, 53)' },
      { type: 'research_theme', color: 'rgb(251, 191, 36)' },
      { type: 'institution', color: 'rgb(192, 132, 252)' },
      { type: 'topic', color: 'rgb(253, 224, 71)' },
      { type: 'synthesis', color: 'rgb(251, 113, 133)' },
      { type: 'search', color: 'rgb(253, 224, 71)' },
    ];
  } else if (clean === "Cluster_2") {
    return [
      { type: 'Destination', color: 'rgb(120, 175, 235)' },
      { type: 'Call', color: 'rgb(214, 176, 99)' },
    ];
  } else {
    return [
      { type: 'Destination', color: 'rgb(98, 170, 247)' },
      { type: 'Call', color: 'rgb(223, 180, 94)' },
    ];
  }
};
