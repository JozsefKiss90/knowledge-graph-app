export function createLayoutFactory({ cy, layoutOptionsRef, layerMeta }) {
  return function createLayout() {
    const opts = layoutOptionsRef.current || {};
    const name = opts.name || "cose-bilkent";
    const fit = opts.fit !== false;

    if (name === "breadthfirst") {
      let roots;

      if (layerMeta.isClusterOverview) {
        const rootNodes = cy.nodes("node[type='cluster'], node[category='cluster']");
        if (rootNodes.length > 0) roots = rootNodes;
      } else if (layerMeta.isDestinationLayer) {
        const rootNodes = cy.nodes("node[type='Destination'], node[category='Destination']");
        if (rootNodes.length > 0) roots = rootNodes;
      }

      return cy.layout({
        ...opts,
        name: "breadthfirst",
        fit,
        animate: false,
        directed: true,
        padding: 80,
        spacingFactor: 1.2,
        circle: false,
        orientation: "vertical",
        nodeDimensionsIncludeLabels: true,
        roots: roots && roots.length > 0 ? roots : undefined,
      });
    }

    return cy.layout({
      ...opts,
      name,
      fit,
      animate: false,
      randomize:
        typeof opts.randomize === "boolean"
          ? opts.randomize
          : layerMeta.isClusterOverview
          ? true
          : false,
    });
  };
}
