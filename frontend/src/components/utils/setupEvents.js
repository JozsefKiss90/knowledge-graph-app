// setupEvents.js
// Throttled hover + click behaviour for both ROOT/cluster and HE_2025 views.

export function setupEvents(cy, navigate, onHoverNodeIdChange, onNodeHover, opts = {}) {
  const { shouldOpenCluster, onClusterOpen, onDestinationToggle } = opts;

  if (!cy || cy.destroyed()) return;

  // -------- Hover (throttled) ----------
  // -------- Hover (throttled) ----------
  let raf = null;
  let pending = null;

  const applyHover = (node) => {
    cy.batch(() => {
      cy.nodes().removeClass("highlighted faded is-hovered");

      if (!node) return;
      node.addClass("is-hovered");
      
      const neigh = node.closedNeighborhood(); // node + its incident edges + neighbours
      const edges = node.connectedEdges();
      const others = cy.elements().not(neigh);

      neigh.nodes().addClass("highlighted");
      edges.addClass("highlighted");
      others.addClass("faded");
    });
  };

  const scheduleHover = (nodeOrNull) => {
    pending = nodeOrNull;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      applyHover(pending);
      raf = null;
    });
  };

  cy.on("mouseover", "node", (evt) => {
    const node = evt.target;
    const d = node.data();

    // Compute rendered + screen positions for the floating card
    const renderedPos = node.renderedPosition();
    const rect = cy.container().getBoundingClientRect();
    const screenPosition = {
      x: rect.left + renderedPos.x,
      y: rect.top + renderedPos.y,
    };

    // Pass enriched data object (old code that only uses d will still work)
    const enriched = { ...d, __renderPosition: renderedPos, __screenPosition: screenPosition };

    onNodeHover?.(enriched);
    onHoverNodeIdChange?.(d.id);
    scheduleHover(node);
  });

   cy.on("mouseout", "node", () => {
    onHoverNodeIdChange?.(null);
    scheduleHover(null);
  });

  // -------- Click / tap ----------
  cy.on("tap", "node", (evt) => {
    const node = evt.target;
    const data = node.data();

    const atRoot = shouldOpenCluster ? !!shouldOpenCluster() : false;

    // From ROOT: open cluster or SP
    if (atRoot) {
      if (data?.type === "cluster" || data?.type === "root") {
        onClusterOpen?.(data);
        return;
      }
    }

    // In cluster views: emphasise selection and optionally reveal calls
    cy.batch(() => {
      cy.nodes().removeClass("highlighted faded");
      cy.edges().removeClass("highlighted faded");

      const neigh = node.closedNeighborhood();
      const others = cy.elements().not(neigh);
      neigh.nodes().addClass("highlighted");
      neigh.edges().addClass("highlighted");
      others.addClass("faded");
    });

    // If the node is a Destination, reveal its calls and zoom to the whole graph
    if ((data?.type === "Destination" || data?.category === "Destination") && onDestinationToggle) {
      onDestinationToggle(cy, data.id);
      // ensure calls are fully visible (remove any fading)
      const callNodes = cy.$("node[category = 'Call'], node[type = 'Call']");
      callNodes.removeClass("faded").addClass("call-visible");
      callNodes.connectedEdges().removeClass("faded").addClass("call-visible");
    }

    // Zoom slightly out so the overall structure is easy to grasp
    try {
      cy.animate({ fit: { eles: cy.elements(), padding: 80 }, duration: 320 });
    } catch {}

    // Default: navigate to details if not in ROOT and not a Destination toggle
    if (!(data?.type === "Destination" || data?.category === "Destination")) {
      const id = data?.id;
      if (id) navigate(`/node/${encodeURIComponent(id)}`, { state: { nodeData: { ...data } } });
    }
  });

  // Cursor hints
  cy.nodes().on("mouseover", () => { try { cy.container().style.cursor = "pointer"; } catch {} });
  cy.nodes().on("mouseout",  () => { try { cy.container().style.cursor = "default"; } catch {} });
}
