import React, { useLayoutEffect, useRef } from "react";
import Cytoscape from "cytoscape";
import cyStyle from "../styles/graphStyles";
import "../styles/graphStyles.scss";
import coseBilkent from 'cytoscape-cose-bilkent';
import { useNavigate } from "react-router-dom";

const GraphView = ({ graphData }) => {
  const containerRef = useRef(null);
  Cytoscape.use(coseBilkent);
  const navigate = useNavigate();

  useLayoutEffect(() => {
    if (!containerRef.current || !graphData || !graphData.nodes || !graphData.rels) return;

    let cyInstance = null;

    // Map nodes
    const nodeElements = graphData.nodes.nodes.map((record, index) => ({
      data: {
        id: record.n.name || `n${index}`,
        label: record.n.name || `Node ${index}`,
        ...record.n,
        labelGroup: record.n.labels?.[1] || "Person", // Use second label if present
      }
    }));

    // Deduplicate edges
    const uniqueEdges = {};
    graphData.rels.relationships.forEach((record) => {
      const key = `${record.a.name}->${record.b.name}`;
      if (!uniqueEdges[key]) {
        uniqueEdges[key] = {
          data: {
            id: `${record.a.name}-${record.b.name}`,
            source: record.a.name,
            target: record.b.name,
            // Optional: label: record.r?.type
            // Remove label to match your request
          }
        };
      }
    });

    const edgeElements = Object.values(uniqueEdges);

    // Init Cytoscape
    cyInstance = Cytoscape({
      container: containerRef.current,
      elements: [...nodeElements, ...edgeElements],
      style: cyStyle,
      layout: {
        name: 'cose-bilkent',
        padding: 30,
        nodeOverlap: 100,
        idealEdgeLength: 1,
        nodeRepulsion: 10000000,
        edgeElasticity: 0.1,
        gravity: 0.2,
        numIter: 1000,
        initialTemp: 1000,
      },
    });

    // After cyInstance = Cytoscape({ ... })
    cyInstance.on('tap', 'node', (event) => {
      const node = event.target;
      const name = node.id();
      navigate(`/node/${encodeURIComponent(name)}`);
    });

    return () => {
      if (cyInstance) cyInstance.destroy();
    };
  }, [graphData, navigate]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
};

export default GraphView;
