// Hover + click behaviour for navigation layers (ROOT / PILLAR_*) and programme graphs.

export function setupEvents(cy, navigate, onHoverNodeIdChange, onNodeHover, opts = {}) {
  const { shouldOpenCluster, onClusterOpen, onDestinationToggle, openNodeDetail } = opts;

  if (!cy || cy.destroyed()) return;

  let raf = null;
  let pending = null;

  const applyHover = (node) => {
    cy.batch(() => {
      cy.nodes().removeClass("highlighted faded is-hovered");
      cy.edges().removeClass("highlighted faded");

      if (!node) return;
      node.addClass("is-hovered");

      const neigh = node.closedNeighborhood();
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

    const renderedPos = node.renderedPosition();
    const renderedSize = { w: node.renderedWidth(), h: node.renderedHeight() };

    const rect = cy.container().getBoundingClientRect();
    const screenPosition = { x: rect.left + renderedPos.x, y: rect.top + renderedPos.y };

    const enriched = {
      ...d,
      __renderPosition: renderedPos,
      __screenPosition: screenPosition,
      __renderedSize: renderedSize,
      __containerRect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
    };

    onNodeHover?.(enriched);
    onHoverNodeIdChange?.(d.id);
    scheduleHover(node);
  });

  cy.on("mouseout", "node", () => {
    onHoverNodeIdChange?.(null);
    scheduleHover(null);
  });

  cy.on("tap", "node", (evt) => {
    const node = evt.target;
    const data = node.data();

    if (data?.type === "root" || data?.type === "pillar" || data?.type === "programme") {
      onClusterOpen?.(data);
      return;
    }

    const atNavLayer = shouldOpenCluster ? !!shouldOpenCluster() : false;

    if (atNavLayer) {
      if (data?.type === "cluster") {
        onClusterOpen?.(data);
      }
      return;
    }

    if ((data?.type === "Destination" || data?.category === "Destination") && onDestinationToggle) {
      onDestinationToggle(cy, data.id);
      return;
    }

    const id = data?.id;
    if (!id) return;

    const returnLayerKey =
      cy?.scratch?.("layerKey") || localStorage.getItem("graphName") || "ROOT";
    const returnGraphName =
      cy?.scratch?.("graphName") || localStorage.getItem("graphName") || "ROOT";

    const payload = {
      id,
      nodeData: { ...data },
      returnLayerKey,
      returnGraphName,
    };

    if (typeof openNodeDetail === "function") {
      openNodeDetail(payload);
      return;
    }

    navigate(`/node/${encodeURIComponent(id)}`, {
      state: payload,
    });
  });

  cy.nodes().on("mouseover", () => {
    try {
      cy.container().style.cursor = "pointer";
    } catch {}
  });

  cy.nodes().on("mouseout", () => {
    try {
      cy.container().style.cursor = "default";
    } catch {}
  });
}