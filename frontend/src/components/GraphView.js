// GraphView.js
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
cytoscape.use(coseBilkent);

import { stylesheet } from "../styles/graphStyles";
import { setupEvents } from "./utils/setupEvents";

/**
 * Props:
 *  - graphData: { nodeElements: [], edgeElements: [] }
 *  - graphName: string
 *  - layoutOptions: Cytoscape layout options (e.g., { name: 'cose-bilkent', ... })
 *  - onCyReady(cy), onNodeHover(nodeData), onHoverNodeIdChange(nodeId)
 *  - nestedHandlers: { onClusterOpen, onDestinationToggle, popLevel }
 */
const GraphView = forwardRef(function GraphView(
  {
    graphData,
    graphName,
    layoutOptions = { name: "cose-bilkent" },
    onCyReady,
    onNodeHover,
    onHoverNodeIdChange,
    nestedHandlers,
  },
  ref
) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [ready, setReady] = useState(false);

  // keep the latest callbacks in refs so we don't recreate Cytoscape when they change
  const nhRef = useRef(nestedHandlers);
  const hoverRef = useRef(onNodeHover);
  const hoverIdRef = useRef(onHoverNodeIdChange);

  useEffect(() => { nhRef.current = nestedHandlers; }, [nestedHandlers]);
  useEffect(() => { hoverRef.current = onNodeHover; }, [onNodeHover]);
  useEffect(() => { hoverIdRef.current = onHoverNodeIdChange; }, [onHoverNodeIdChange]);

  const elements = useMemo(() => {
    if (!graphData) return [];
    const nodes = Array.isArray(graphData.nodeElements)
      ? graphData.nodeElements
      : graphData.nodes || [];
    const edges = Array.isArray(graphData.edgeElements)
      ? graphData.edgeElements
      : graphData.edges || [];
    return [...nodes, ...edges];
  }, [graphData]);

  useEffect(() => {
    if (!containerRef.current) return;

    // destroy previous instance
    if (cyRef.current) {
      try { cyRef.current.destroy(); } catch {}
      cyRef.current = null;
    }

    // create new instance
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: stylesheet,
      wheelSensitivity: 0.2,
      minZoom: 0.1,
      maxZoom: 4,
      selectionType: "single",
      pixelRatio: 1,
    });
    cyRef.current = cy;

    // stash graph name so event handlers can branch without reinit
    cy.scratch("graphName", graphName);

    // run layout
    let layout;
    try {
      layout = cy.layout(layoutOptions?.name ? layoutOptions : { name: "cose-bilkent" });
    } catch {
      layout = cy.layout({ name: "cose" });
    }
    layout.on("layoutstop", () => {
      cy.nodes().forEach((n) => n.lock());
      cy.animate({ fit: { eles: cy.elements(), padding: 60 }, duration: 300 });
    });
    layout.run();

    // stable wrappers that always read the latest refs
    const stableHandlers = {
      onClusterOpen: (d) => nhRef.current?.onClusterOpen?.(d),
      onDestinationToggle: (cyI, id) => nhRef.current?.onDestinationToggle?.(cyI, id),
      popLevel: () => nhRef.current?.popLevel?.(),
    };

    setupEvents(cy, {
      onNodeHover: (d) => hoverRef.current?.(d),
      onHoverNodeIdChange: (id) => hoverIdRef.current?.(id),
      nestedHandlers: stableHandlers,
    });

    setReady(true);
    onCyReady?.(cy);

    return () => {
      try { cy.destroy(); } catch {}
      cyRef.current = null;
      setReady(false);
    };
    // NOTE: intentionally NOT depending on nestedHandlers / onNodeHover / onHoverNodeIdChange
    // to avoid destroying + recreating Cytoscape when those change.
  }, [elements, layoutOptions, graphName, onCyReady]);

  useImperativeHandle(ref, () => ({
    rerunLayout: () => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.nodes().forEach((n) => n.unlock());

      let layout;
      try {
        layout = cy.layout(layoutOptions?.name ? layoutOptions : { name: "cose-bilkent" });
      } catch {
        layout = cy.layout({ name: "cose" });
      }

      layout.on("layoutstop", () => {
        cy.nodes().forEach((n) => n.lock());
        cy.animate({ fit: { eles: cy.elements(), padding: 60 }, duration: 300 });
      });
      layout.run();
    },
    getCy: () => cyRef.current,
  }));

  return (
    <div
      data-graph-name={graphName}
      ref={containerRef}
      className="cytoscape_container"
      style={{ width: "100%", height: "100%", position: "relative", opacity: ready ? 1 : 0 }}
    />
  );
});

export default GraphView;
