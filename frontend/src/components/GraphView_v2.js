// --- Updated GraphView.js ---

import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import Cytoscape from "cytoscape";
import cyStyle from "../styles/graphStyles";
import "../styles/graphStyles.scss";
import coseBilkent from 'cytoscape-cose-bilkent';
import { useNavigate } from "react-router-dom";

const GraphView = ({ graphData, rawGraphData, onCyReady, onNodeHover, onHoverNodeIdChange, hoveredNodeIdRef  }) => {
  const containerRef = useRef(null);
  const [cyInstance, setCyInstance] = useState(null);
  Cytoscape.use(coseBilkent);
  const navigate = useNavigate();

  useEffect(() => {
    if (!cyInstance || !hoveredNodeIdRef) return;
  
    const interval = setInterval(() => {
      const hoveredId = hoveredNodeIdRef.current;
      cyInstance.nodes().forEach(node => {
        const showFull = node.id() === hoveredId;
        node.data('displayLabel', showFull ? node.data('label') : node.data('shortLabel'));
      });
      cyInstance.style().update();
    }, 150); // update every 150ms
  
    return () => clearInterval(interval);
  }, [cyInstance, hoveredNodeIdRef]);
  
  useLayoutEffect(() => {
    if (
      !containerRef.current ||
      !graphData?.nodes?.nodes ||
      !graphData?.rels?.relationships ||
      !rawGraphData?.nodes
    )
     {
      console.warn("🔴 Missing data:", {
        containerRefReady: !!containerRef.current,
        graphNodesReady: !!graphData?.nodes?.nodes,
        graphRelsReady: !!graphData?.rels?.relationships,
        rawNodesReady: !!rawGraphData?.nodes?.nodes,
      });
      return;
    }

    const rawNodeMap = new Map();
    rawGraphData.nodes.nodes.forEach(wrapper => {
      const node = wrapper.n || wrapper;  // handles both wrapped and unwrapped
      rawNodeMap.set(node.id, node);
    });
    

    const nodeElements = [];
    const nodeIdSet = new Set();

    graphData.nodes.nodes.forEach((wrappedNode) => {
      const node = wrappedNode.n || wrappedNode;
      if (node.id && node.name) {
        nodeElements.push({
          data: {
            id: node.id,
            label: node.name,
            shortLabel: node.name.length > 22 ? node.name.slice(0, 20) + '...' : node.name,
            displayLabel: node.name, 
            ...node,
          }
        });
        nodeIdSet.add(node.id);
      }
    });

    const edgeElements = [];

    if (graphData.rels?.relationships) {
      graphData.rels.relationships.forEach((rel) => {
        const { id, source, target, type, label } = rel;
        if (!nodeIdSet.has(source) && rawNodeMap.has(source)) {
          const sourceNode = rawNodeMap.get(source);
          nodeElements.push({
            data: {
              id: sourceNode.id,
              label: sourceNode.name || sourceNode.id,
              shortLabel: (sourceNode.name || sourceNode.id).length > 22
                ? (sourceNode.name || sourceNode.id).slice(0, 20) + '...'
                : (sourceNode.name || sourceNode.id),
              ...sourceNode,
            }
          });
          nodeIdSet.add(source);
        }

        if (!nodeIdSet.has(target) && rawNodeMap.has(target)) {
          const targetNode = rawNodeMap.get(target);
          nodeElements.push({
            data: {
              id: targetNode.id,
              label: targetNode.name || targetNode.id,
              ...targetNode,
            }
          });
          nodeIdSet.add(target);
        }

        if (nodeIdSet.has(source) && nodeIdSet.has(target)) {
          edgeElements.push({
            data: {
              id,
              source,
              target,
              label: label || type,
              type: type,
              score: rel.score ?? null, // add score explicitly
              topic_id: rel.topic_id ?? null,
              keywords: rel.keywords ?? null,
            }
          });
          
        } else {
          console.warn(`⚠️ Skipping edge ${id}: missing source or target node.`);
        }
      });
    }


    const cy = Cytoscape({
      container: containerRef.current,
      elements: [...nodeElements, ...edgeElements],
      style: cyStyle
    });

    setCyInstance(cy);

    if (onCyReady) onCyReady(cy);

    const layout = cy.layout({
      name: 'cose-bilkent',
      animate: false,
      refresh: false,
      randomize: true,
      padding: 30,
      nodeOverlap: 100,
      idealEdgeLength: 100,
      nodeRepulsion: 4000,
      edgeElasticity: 0.45,
      gravity: 0.25,
      numIter: 1000,
      initialTemp: 1000,
    });
    
    layout.run();
    
    // 👇 Stop after layout is done
    layout.on('layoutstop', () => {
      // Freeze layout logic forever
      cy.nodes().forEach(n => n.lock()); // Optional
      cy.layout({ name: 'preset' }).run();  // ⛔ disables further layout effects
    });

    cy.on('mouseover', 'node', (event) => {
      const nodeData = event.target.data();
      if (onHoverNodeIdChange) onHoverNodeIdChange(nodeData.id);
      if (onNodeHover) onNodeHover(nodeData);
    });
    
    cy.on('mouseout', 'node', () => {
      if (onHoverNodeIdChange) onHoverNodeIdChange(null);
    });
    
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const id = node.data('id');
      if (id) {
        setTimeout(() => {
          navigate(`/node/${encodeURIComponent(id)}`);
        }, 100);
      } else {
        console.warn('⚠️ Node without valid ID clicked:', node.data());
      }
    });

    return () => {
      cy.destroy();
    };
  }, [graphData, rawGraphData, navigate]);

  return (
    <>
      <div ref={containerRef} style={{ width: "100%", height: "100%", backgroundColor: "rgba(64, 64, 64, 1)" }} />
    </>
  );
};

export default GraphView;