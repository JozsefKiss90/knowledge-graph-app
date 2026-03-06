export function tagRootNode({ cy, layerKey, PALETTE }) {
  const cleanLayerKey = String(layerKey || "").replace("_cose", "");
  const isRootLayer = cleanLayerKey === "ROOT";
  const isClusterOverview = cleanLayerKey.startsWith("Cluster_");
  const isDestinationLayer = cleanLayerKey.startsWith("DEST_");
  const isProgrammeLayer = !isRootLayer && !isClusterOverview && !isDestinationLayer;

  cy.nodes().removeClass("as-root as-cluster-root as-destination-root");

  let rootNode = null;

  // ✅ 1) Prefer explicit root node in the graph
  rootNode = cy.nodes("node[type='root'], node[category='root']").first();
  if (!rootNode || rootNode.empty()) rootNode = null;

  // Existing special cases (destination / cluster) can override if needed
  if (!rootNode && isDestinationLayer) {
    rootNode = cy.nodes("node[type='Destination'], node[category='Destination']").first();
  }

  if (!rootNode && isClusterOverview) {
    rootNode = cy.$id(cleanLayerKey);
    if (!rootNode || rootNode.empty()) {
      rootNode = cy
        .nodes("node[type='cluster'], node[category='cluster'], node[type='Cluster'], node[category='Cluster']")
        .first();
    }
  }

  // Ultimate fallback
  if ((!rootNode || rootNode.empty()) && cy.nodes().length) {
    rootNode = cy.nodes().first();
  }

  if (rootNode && !rootNode.empty()) {
    // Programme layers + root layers both use as-root styling
    if (isRootLayer || isProgrammeLayer) {
      rootNode.addClass("as-root");

      // ✅ Distinct color ONLY for meta-level ROOT_EU
      if (isRootLayer && rootNode.id && rootNode.id() === "ROOT_EU") {
        rootNode.data("themeRootColor", PALETTE.root);
      } else {
        // ✅ Everything else inherits computed node color (so ROOT_HE becomes green)
        rootNode.data("themeRootColor", rootNode.data("themeColor") || PALETTE.base);
      }
    } else if (isDestinationLayer) {
      rootNode.addClass("as-destination-root");
      rootNode.data("themeDestinationRootColor", PALETTE.Destination);
    } else if (isClusterOverview) {
      rootNode.addClass("as-cluster-root");
      rootNode.data("themeClusterRootColor", PALETTE.cluster);
    }
  }

  return { cleanLayerKey, isRootLayer, isProgrammeLayer, isClusterOverview, isDestinationLayer };
}