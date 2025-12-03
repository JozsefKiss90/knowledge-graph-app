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
import coseBilkent from "cytoscape-cose-bilkent"; // <-- register the layout
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
    layoutOptions = {name: "cose-bilkent" },
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

    if (cyRef.current) {
      try {
        cyRef.current.destroy();
      } catch {}
      cyRef.current = null;
    }

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

    // Run layout (fallback to 'cose' if an unknown layout name sneaks in)
    const chosen = layoutOptions?.name ? layoutOptions : { name: "cose-bilkent" };
    let layout;
    try {
      layout = cy.layout(chosen);
    } catch {
      layout = cy.layout({ name: "cose" });
    }

    layout.on("layoutstop", () => {
      cy.nodes().forEach((n) => n.lock());
      cy.animate({ fit: { eles: cy.elements(), padding: 60 }, duration: 300 });
    });
    layout.run();

    setupEvents(cy, {
      onNodeHover,
      onHoverNodeIdChange,
      nestedHandlers,
    });

    setReady(true);
    onCyReady?.(cy);

    return () => {
      try {
        cy.destroy();
      } catch {}
      cyRef.current = null;
      setReady(false);
    };
  }, [elements, layoutOptions, onCyReady, onNodeHover, onHoverNodeIdChange, nestedHandlers]);

  useImperativeHandle(ref, () => ({
    rerunLayout: () => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.nodes().forEach((n) => n.unlock());

      const chosen = layoutOptions?.name ? layoutOptions : { name: "cose-bilkent" };
      let layout;
      try {
        layout = cy.layout(chosen);
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
