export function tagRootNode({ cy, layerKey, PALETTE }) {
  const cleanLayerKey = String(layerKey || "").replace("_cose", "");
  const isRootLayer = cleanLayerKey === "ROOT";
  const isClusterOverview = cleanLayerKey.startsWith("Cluster_");
  const isDestinationLayer = cleanLayerKey.startsWith("DEST_");

  cy.nodes().removeClass("as-root as-cluster-root as-destination-root");

  let rootNode = null;

  if (isRootLayer) {
    rootNode = cy.$id("ROOT_HE");
    if (!rootNode || rootNode.empty()) {
      rootNode = cy.nodes("node[type='root'], node[category='root']").first();
    }
  } else if (isDestinationLayer) {
    rootNode = cy.nodes("node[type='Destination'], node[category='Destination']").first();
  } else if (isClusterOverview) {
    rootNode = cy.$id(cleanLayerKey);
    if (!rootNode || rootNode.empty()) {
      rootNode = cy
        .nodes(
          "node[type='cluster'], node[category='cluster'], node[type='Cluster'], node[category='Cluster']"
        )
        .first();
    }
    if (!rootNode || rootNode.empty()) {
      const nodesAll = cy.nodes();
      if (nodesAll.length > 0) {
        const md = nodesAll.maxDegree(false);
        rootNode = md && md.ele ? md.ele : nodesAll.first();
      } else {
        rootNode = null;
      }
    }
  }

  if (rootNode && !rootNode.empty()) {
    if (isRootLayer) {
      rootNode.addClass("as-root");
      rootNode.data("themeRootColor", PALETTE.root);
    } else if (isDestinationLayer) {
      rootNode.addClass("as-destination-root");
      rootNode.data("themeDestinationRootColor", PALETTE.Destination);
    } else if (isClusterOverview) {
      rootNode.addClass("as-cluster-root");
      rootNode.data("themeClusterRootColor", PALETTE.cluster);
    }
  }

  return { cleanLayerKey, isRootLayer, isClusterOverview, isDestinationLayer };
}
