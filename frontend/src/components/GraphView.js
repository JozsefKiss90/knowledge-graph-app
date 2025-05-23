// --- Refactored GraphView.js using helper utils ---

import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
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

const GraphView = ({ graphData, rawGraphData, onCyReady, onNodeHover, onHoverNodeIdChange, hoveredNodeIdRef, graphName }) => {
  const containerRef = useRef(null);
  const [cyInstance, setCyInstance] = useState(null);
  const navigate = useNavigate();

  Cytoscape.use(coseBilkent);
  Cytoscape.use(dagre);
  Cytoscape.use( klay );

  // Update displayLabel on hover
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
      style: cyStyle,
      pixelRatio: 2,
      maxZoom: 2,
      minZoom: 0.3,
    });    
  
    setCyInstance(cy);
    if (onCyReady) onCyReady(cy);

    const layout = cy.layout(layoutConfig[graphName] || layoutConfig["HE_2025"]);
    layout.run();
   
    layout.on("layoutstop", () => {
      cy.nodes().forEach(n => n.lock());
      cy.fit(cy.nodes(), 50);
      if (cy.zoom() > 1.5) {
        cy.zoom(1.5);
        cy.center();
      }
    });

    setupEvents(cy, navigate, onHoverNodeIdChange, onNodeHover);
      //cy.fit();
      //cy.center()
      //cy.resize()

      return () => {
        cy.destroy();
      };
  }, [graphData, rawGraphData, navigate]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", backgroundColor: "rgb(36, 55, 66)"}}
    />
  );
};

export default GraphView;
