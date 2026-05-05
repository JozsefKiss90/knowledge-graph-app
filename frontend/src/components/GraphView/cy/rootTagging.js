export function tagRootNode({ cy, layerKey, PALETTE }) {
  const cleanLayerKey = String(layerKey || "").replace("_cose", "");
  const isRootLayer = cleanLayerKey === "ROOT";
  const isClusterOverview = cleanLayerKey.startsWith("Cluster_");
  const isDestinationLayer = cleanLayerKey.startsWith("DEST_");
  const isProgrammeLayer = !isRootLayer && !isClusterOverview && !isDestinationLayer;

  cy.nodes().removeClass("as-root as-cluster-root as-destination-root");

  let rootNode = null;

  // 1) explicit root node
  rootNode = cy.nodes("node[type='root'], node[category='root']").first();
  if (!rootNode || rootNode.empty()) rootNode = null;

  // 2) destination layer root
  if (!rootNode && isDestinationLayer) {
    rootNode = cy.nodes("node[type='Destination'], node[category='Destination']").first();
    if (!rootNode || rootNode.empty()) rootNode = null;
  }

  // 3) programme layers: prefer node id matching dataset key,
  // then try known programme-root labels
  if (!rootNode && isProgrammeLayer) {
    rootNode = cy.$id(cleanLayerKey);
    if (!rootNode || rootNode.empty()) {
      const key = cleanLayerKey.toLowerCase();

      rootNode = cy.nodes().filter((n) => {
        const d = n.data() || {};
        const id = String(d.id || "").toLowerCase();
        const label = String(d.fullLabel ?? d.label ?? d.name ?? "").toLowerCase();

        if (id === key) return true;

        if (key === "euratom") return label.includes("euratom research and training programme");
        if (key === "dep") return label.includes("digital europe");
        if (key === "erasmus") return label.includes("erasmus");
        if (key === "cef") return label.includes("connecting europe facility");
        if (key === "crea") return label.includes("creative europe");
        if (key === "widera") return label.includes("widening participation");
        if (key === "eic") return label === "eic";
        if (key === "eie") return label === "eie";
        if (key === "msca") return label.includes("marie skłodowska-curie") || label.includes("marie sklodowska-curie");
        if (key === "infra") return label.includes("research infrastructures");
        if (key === "miss") return label.includes("missions");
        if (key === "horizon europe") return label === "horizon europe";

        return false;
      }).first();
    }

    if (!rootNode || rootNode.empty()) rootNode = null;
  }

  // 4) cluster overview root
  if (!rootNode && isClusterOverview) {
    rootNode = cy.$id(cleanLayerKey);
    if (!rootNode || rootNode.empty()) {
      rootNode = cy
        .nodes("node[type='cluster'], node[category='cluster'], node[type='Cluster'], node[category='Cluster']")
        .first();
    }
    if (!rootNode || rootNode.empty()) rootNode = null;
  }

  // 5) only use blind fallback for ROOT / DEST / CLUSTER layers, never for programme layers
  if (!rootNode && !isProgrammeLayer && cy.nodes().length) {
    rootNode = cy.nodes().first();
  }

  if (rootNode && !rootNode.empty()) {
    if (isRootLayer || isProgrammeLayer || isClusterOverview) {
      rootNode.addClass("as-root");
      rootNode.data("themeRootColor", rootNode.data("themeColor") || PALETTE.base);
    } else if (isDestinationLayer) {
      rootNode.addClass("as-destination-root");
      rootNode.data("themeDestinationRootColor", PALETTE.Destination);
    }
  }

  return { cleanLayerKey, isRootLayer, isProgrammeLayer, isClusterOverview, isDestinationLayer };
}