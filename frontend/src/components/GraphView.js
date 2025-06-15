// --- Refactored GraphView.js using helper utils ---

import { useLayoutEffect, useRef, useState,forwardRef, useImperativeHandle, useEffect } from "react";
import Cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";
import coseBilkent from "cytoscape-cose-bilkent";
import { useNavigate } from "react-router-dom";
import cyStyle from "../styles/graphStyles";
import "../styles/graphStyles.scss";
import { buildElements } from "./utils/buildElements";
import { layoutConfig } from "./utils/layoutConfig";
import { setupEvents } from "./utils/setupEvents";
import klay from 'cytoscape-klay';
import '../styles/main.scss'
import { useDarkMode } from "./context/DarkModeContext";

const GraphView = forwardRef((props, ref) => {
  const {
    graphData,
    graphref,
    rawGraphData, 
    onCyReady,
    onNodeHover,
    onHoverNodeIdChange,
    hoveredNodeIdRef,
    graphName,
    layoutOptions,
  } = props;

  const containerRef = useRef(null);
  const [cyInstance, setCyInstance] = useState(null); 
  const navigate = useNavigate();
  const { darkMode } = useDarkMode(); 
  const cyRef = useRef(null);
  
  Cytoscape.use(coseBilkent);
  Cytoscape.use(dagre);
  Cytoscape.use( klay );

  useEffect(() => {
    if (graphref.current && graphData.nodes.length > 0) {
      graphref.current.rerunLayout();
      console.log("rerun layout with " + graphref.current) // this is not logged
    }
  }, [graphName, graphData]);

  useEffect(() => {
    if (!cyInstance || !hoveredNodeIdRef) return;

    const interval = setInterval(() => {
      const hoveredId = hoveredNodeIdRef.current;
      cyInstance.nodes().forEach(node => {
        const showFull = node.id() === hoveredId;
        node.data('displayLabel', showFull ? node.data('label') : node.data('shortLabel'));
      });
      cyInstance.style().update();
    }, 150);

    return () => clearInterval(interval);
  }, [cyInstance, hoveredNodeIdRef]);

  useImperativeHandle(ref, () => ({
    rerunLayout: () => {
      if (cyRef.current) {
        cyRef.current.nodes().unlock(); // unlock before layout
        const layout = cyRef.current.layout(layoutOptions); // 🔄 use updated layoutOptions
        layout.run();
      }
    },
  }));

  useLayoutEffect(() => {
    const hasRequiredData =
    containerRef.current &&
    Array.isArray(graphData?.nodes?.nodes) &&
    Array.isArray(graphData?.rels?.relationships) &&
    rawGraphData?.nodes?.nodes !== undefined;

    if (!hasRequiredData) {
      console.warn("🔴 Missing data:", {
        containerRefReady: !!containerRef.current,
        graphNodesReady: Array.isArray(graphData?.nodes?.nodes),
        graphRelsReady: Array.isArray(graphData?.rels?.relationships),
        rawNodesReady: rawGraphData?.nodes?.nodes !== undefined,
      });
      return;
    }

    const { nodeElements, edgeElements } = buildElements(graphData, rawGraphData);

    const cy = Cytoscape({
      container: containerRef.current,
      elements: [...nodeElements, ...edgeElements],
      style: cyStyle(darkMode),
      pixelRatio: 2,
      maxZoom: 3,
      minZoom: graphName === 'HE_2025' ? 0.95 : 0.1,
    });    
    cyRef.current = cy;
    setCyInstance(cy);
    if (onCyReady) onCyReady(cy);

    const layout = cy.layout(layoutConfig[graphName]);
    layout.run();
   
    layout.on("layoutstop", () => {
      cy.nodes().forEach(n => n.lock());
      cy.fit(cy.nodes(), 50);
      /*if (cy.zoom() > 1.5) {
        //cy.zoom(1.5);
        //cy.center();
      }*/
    });

    setupEvents(cy, navigate, onHoverNodeIdChange, onNodeHover);
      //cy.fit();
      //cy.center() 
      //cy.resize()

      return () => {
        cy.destroy();
      };
  }, [graphData, rawGraphData, navigate, darkMode]);

  return (
    <div
      ref={containerRef}
      className="graph-container"
      style={{ width: "100%", height: "100%"}}
    />
  );
});

export default GraphView;

