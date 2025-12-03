// setupEvents.js

/**
 * Sets up Cytoscape interactions:
 *  - hover highlights via callbacks
 *  - click on cluster => nestedHandlers.onClusterOpen(data)
 *  - click on destination => nestedHandlers.onDestinationToggle(cy, id)
 *  - click on anything else => emits hover id change (so external router can handle)
 *
 * @param {cytoscape.Core} cy
 * @param {Object} options
 * @param {Function} [options.onNodeHover]
 * @param {Function} [options.onHoverNodeIdChange]
 * @param {Object}   [options.nestedHandlers]
 */
export function setupEvents(cy, { onNodeHover, onHoverNodeIdChange, nestedHandlers } = {}) {
  const onClusterOpen = nestedHandlers?.onClusterOpen;
  const onDestinationToggle = nestedHandlers?.onDestinationToggle;

  // Hover
  cy.on("mouseover", "node", (evt) => {
    const n = evt.target;
    onNodeHover?.(n.data());
    onHoverNodeIdChange?.(n.id());
  });

  cy.on("mouseout", "node", () => {
    onNodeHover?.(null);
    onHoverNodeIdChange?.(null);
  });

  // Click/tap
  cy.on("tap", "node", (evt) => {
    const node = evt.target;
    const data = node.data() || {};
    const id = data.id || node.id();
    if (!id) return;

    const isCluster =
      data.type === "cluster" ||
      /^CL\d$/.test(id) ||
      /^Cluster[_\s]?\d/.test(id);

    if (isCluster && typeof onClusterOpen === "function") {
      onClusterOpen(data);
      return;
    }

    const isDestination = data.type === "Destination" || /Destination/i.test(data.category || "");
    if (isDestination && typeof onDestinationToggle === "function") {
      onDestinationToggle(cy, id);
      return;
    }

    // Default: just emit the id change; your router or detail panel can listen
    onHoverNodeIdChange?.(id);
  });

  // Quality-of-life: Shift toggles ALL calls on the current level
  const keyHandler = (e) => {
    if (e.key === "Shift") {
      const calls = cy.nodes('[type = "Call"], [category = "Call"]');
      const anyHidden = calls.some((n) => n.hasClass("call-hidden"));
      if (anyHidden) {
        calls.removeClass("call-hidden").addClass("call-visible");
        calls.connectedEdges().removeClass("call-hidden").addClass("call-visible");
      } else {
        calls.removeClass("call-visible").addClass("call-hidden");
        calls.connectedEdges().removeClass("call-visible").addClass("call-hidden");
      }
    }
  };
  window.addEventListener("keydown", keyHandler);
  cy.on("destroy", () => window.removeEventListener("keydown", keyHandler));
}
