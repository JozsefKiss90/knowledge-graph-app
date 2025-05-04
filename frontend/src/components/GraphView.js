// --- Refactored GraphView.js using helper utils ---

import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import Cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import { useNavigate } from "react-router-dom";
import cyStyle from "../styles/graphStyles";
import "../styles/graphStyles.scss";

import { buildElements } from "./utils/buildElements";
import { layoutConfig } from "./utils/layoutConfig";
import { setupEvents } from "./utils/setupEvents";

const GraphView = ({ graphData, rawGraphData, onCyReady, onNodeHover, onHoverNodeIdChange, hoveredNodeIdRef }) => {
  const containerRef = useRef(null);
  const [cyInstance, setCyInstance] = useState(null);
  const navigate = useNavigate();

  Cytoscape.use(coseBilkent);

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
    if (!containerRef.current || !graphData?.nodes?.nodes || !graphData?.rels?.relationships || !rawGraphData?.nodes) {
      console.warn("🔴 Missing data:", { 
        containerRefReady: !!containerRef.current,
        graphNodesReady: !!graphData?.nodes?.nodes,
        graphRelsReady: !!graphData?.rels?.relationships,
        rawNodesReady: !!rawGraphData?.nodes?.nodes,
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

    const layout = cy.layout(layoutConfig);
    layout.run();

    layout.on("layoutstop", () => {
      cy.nodes().forEach(n => n.lock());
      cy.layout({ name: "preset" }).run();
    });

    setupEvents(cy, navigate, onHoverNodeIdChange, onNodeHover);
   // cy.fit(100, 100);
    //cy.pan({ x: -100, y: 0});
    //cy.zoom(1.3);
    //cy.center()
    cy.resize()

    return () => {
      cy.destroy();
    };
  }, [graphData, rawGraphData, navigate]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", backgroundColor: "rgba(64, 64, 64, 1)" }}
    />
  );
};

export default GraphView;
