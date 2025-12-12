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
import { stylesheet } from "../styles/graphStyles";
import { setupEvents } from "./utils/setupEvents";
import { useNavigate } from "react-router-dom";
cytoscape.use(coseBilkent);

/**
 * Props:
 *  - graphData: { nodeElements: [], edgeElements: [] } or { nodes: [], edges: [] }
 *  - graphName: string
 *  - layoutOptions: { name: string, fit?: boolean, ... } (we track only .name and .fit)
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
  const navigate = useNavigate();
    // only track layout name + fit to avoid churn
  const layoutName = layoutOptions?.name || "cose-bilkent";
  const layoutFit = layoutOptions?.fit !== false; // default true
  
  const nhRef = useRef(nestedHandlers);
  const hoverRef = useRef(onNodeHover);
  const hoverIdRef = useRef(onHoverNodeIdChange);
  const onCyReadyRef = useRef(onCyReady);
  const lastLayoutNameRef = useRef("cose-bilkent"); 

  useEffect(() => { nhRef.current = nestedHandlers; }, [nestedHandlers]);
  useEffect(() => { hoverRef.current = onNodeHover; }, [onNodeHover]);
  useEffect(() => { hoverIdRef.current = onHoverNodeIdChange; }, [onHoverNodeIdChange]);
  useEffect(() => { onCyReadyRef.current = onCyReady; }, [onCyReady]);
  // flatten elements once per graphData identity
  const elements = useMemo(() => {
    if (!graphData) return [];
    const nodes = Array.isArray(graphData.nodeElements)
      ? graphData.nodeElements
      : graphData.nodes || graphData.Nodes || [];
    const edges = Array.isArray(graphData.edgeElements)
      ? graphData.edgeElements
      : graphData.edges || graphData.Edges || [];
    return [...nodes, ...edges];
  }, [graphData]);

  const layoutOptionsRef = useRef(layoutOptions);
  useEffect(() => {
    layoutOptionsRef.current = layoutOptions;
  }, [layoutOptions]);

  useEffect(() => {
    if (!containerRef.current) return;

    // destroy previous instance if any
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
      minZoom: 0.1,
      maxZoom: 4,
      selectionType: "single",
      pixelRatio: 1,
    });
    cyRef.current = cy;
    cy.scratch("graphName", graphName);

    // basic helper classes
    cy.style()
      .append([
        { selector: ".faded", style: { opacity: 0.15 } },
        { selector: ".highlighted", style: { "border-width": 2, "border-color": "#fff" } },
        { selector: ".call-hidden", style: { display: "none" } },
        { selector: ".call-visible", style: { display: "element" } },
      ])
      .update();

    // helper to build correct layout config
    const createLayout = () => {
      const opts = layoutOptionsRef.current || {};
      const name = opts.name || layoutName || "cose-bilkent";
      const fit = opts.fit !== false;

      if (name === "breadthfirst") {
        let roots;
        if (graphName.startsWith("Cluster_")) {
          const rootNodes = cy.nodes(
            "node[type = 'cluster'], node[category = 'cluster']"
          );
          if (rootNodes.length > 0) {
            roots = rootNodes;
          }
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

            // default: force-directed
      const isClusterLayer = graphName.startsWith("Cluster_");

      return cy.layout({
        ...opts,
        name,
        fit,
        animate: false,
        // important: break out of any previous collinear geometry,
        // especially when coming back from the tree layout
        randomize:
          typeof opts.randomize === "boolean"
            ? opts.randomize
            : isClusterLayer
            ? true
            : false,
      });
    };

    const layout = createLayout();
    layout.on("layoutstop", () => {
      setReady(true);
    });
    layout.run();

    // NEW: ensure the view is refitted without animation
    const opts = layoutOptionsRef.current || {};
    const fit = opts.fit !== false;
    if (fit) {
      cy.fit(cy.elements(), 80); // padding can be tuned
    }


    // events
    setupEvents(
      cy,
      navigate,
      (id) => hoverIdRef.current && hoverIdRef.current(id),
      (data) => hoverRef.current && hoverRef.current(data),
      {
        shouldOpenCluster: () => cy.scratch("graphName") === "ROOT",
        onClusterOpen: (data) => nhRef.current?.onClusterOpen?.(data),
        onDestinationToggle: (_, id) =>
          nhRef.current?.onDestinationToggle?.(cy, id),
      }
    );

    onCyReadyRef.current && onCyReadyRef.current(cy);

    return () => {
      try {
        cy.destroy();
      } catch {}
      cyRef.current = null;
      setReady(false);
    };
  // IMPORTANT: do NOT depend on layoutName/layoutFit here
  }, [elements, graphName, navigate]);


  useImperativeHandle(ref, () => ({
    rerunLayout: () => {
      const cy = cyRef.current;
      if (!cy) return;

      const prevName = lastLayoutNameRef.current;   // <- capture previous layout first

      const opts = layoutOptionsRef.current || {};
      const name = opts.name || "cose-bilkent";
      const fit = opts.fit !== false;

      const isClusterLayer = graphName.startsWith("Cluster_");
      const comingFromTree = isClusterLayer && prevName === "breadthfirst" && name !== "breadthfirst";
      
      if (isClusterLayer && comingFromTree) {
        const root = cy.nodes("node[type = 'cluster'], node[category = 'cluster']").first();
        if (root && root.nonempty()) {
          // place root higher to bias a 2D spread
          root.position({ x: 0, y: -200 });
        }
      }

      if (comingFromTree) {
        cy.batch(() => {
          const w = cy.width() || 1000;
          const h = cy.height() || 800;
          cy.nodes().forEach((n) => {
            n.position({
              x: (Math.random() - 0.5) * w * 0.6,
              y: (Math.random() - 0.5) * h * 0.6,
            });
          });
        });
      }

    const layout =
      name === "breadthfirst"
        ? cy.layout({
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
          })
        : cy.layout({
            ...opts,
            name,
            fit,
            animate: false,
            // override config’s randomize:false ONLY when coming from tree on clusters
            randomize: comingFromTree ? true : false,
          });

    layout.run();

    if (fit) cy.fit(cy.elements(), 80);
      lastLayoutNameRef.current = name;  // <- update AFTER the switch
    },
      getCy: () => cyRef.current,
    }));

  return (
    <div
      data-graph-name={graphName}
      ref={containerRef}
      className="cytoscape_container"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        opacity: ready ? 1 : 0,
      }}
    />
  );
});

export default GraphView;
