// --- LegendToggle.js (refactored with MUI and modular components) ---

import React, { useState, useEffect } from 'react';
import { useCy } from "./context/CyContext";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import NodeTypeToggle from './LegendParts/NodeTypeToggle';
import EdgeTypeToggle from './LegendParts/EdgeTypeToggle';
import SearchBox from './LegendParts/SearchBox';
import ScoreFilter from './LegendParts/ScoreFilter';

const Legend = ({ hoveredNodeRef, graphName }) =>  {
  const cy = useCy();
  const [hoveredNode, setHoveredNode] = useState(null);
  const defaultEdgeTypes = {
    HE_2025: new Set(['BELONGS_TO_TOPIC', 'SHARED_TOPIC', 'CROSS_TOPIC_SIMILARITY']),
    Cluster_4: new Set(['HAS_DESTINATION', 'HAS_THEME', 'HAS_CALL'])
  };

  const defaultNodeTypes = {
    HE_2025: new Set(['policy', 'strategy', 'cluster', 'research_theme', 'institution', 'topic']),
    Cluster_4: new Set(['Cluster', 'Destination', 'Theme', 'Call'])
  };

  const [visibleEdgeTypes, setVisibleEdgeTypes] = useState(defaultEdgeTypes[graphName]);
  const [visibleNodeTypes, setVisibleNodeTypes] = useState(defaultNodeTypes[graphName]);

  const edgeTypeList = graphName === 'HE_2025'
  ? [
      { type: 'BELONGS_TO_TOPIC', color: 'rgb(0, 219, 117)' },
      { type: 'SHARED_TOPIC', color: '#2196f3' },
      { type: 'CROSS_TOPIC_SIMILARITY', color: '#ff9800' }
    ]
  : [
      { type: 'HAS_DESTINATION', color: '#42a5f5' },
      { type: 'HAS_THEME', color: '#7986cb' },
      { type: 'HAS_CALL', color: '#ffb74d' }
    ];

  const nodeTypeList = graphName === 'HE_2025'
    ? [
        { type: 'policy', color: '#00bcd4' },
        { type: 'strategy', color: '#4caf50' },
        { type: 'cluster', color: '#ff7043' },
        { type: 'research_theme', color: '#ffb300' },
        { type: 'institution', color: '#9c27b0' },
        { type: 'topic', color: '#ffc107' }
      ]
    : [
        { type: 'Work Programme', color: '#ff7043' },
        { type: 'Destination', color: '#64b5f6' },
        { type: 'Theme', color: '#7986cb' },
        { type: 'Call', color: '#ffb74d' }
      ];


  useEffect(() => {
    const interval = setInterval(() => {
      setHoveredNode(hoveredNodeRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [hoveredNodeRef]);

  useEffect(() => {
    setVisibleEdgeTypes(defaultEdgeTypes[graphName]);
    setVisibleNodeTypes(defaultNodeTypes[graphName]);
  }, [graphName]);

  const toggleType = (type, typeSet, setter, selectorFn) => {
    if (!cy) return;
    const newSet = new Set(typeSet);
    const elements = selectorFn(type);
    if (newSet.has(type)) {
      newSet.delete(type);
      elements.hide();
    } else {
      newSet.add(type);
      elements.show();
    }
    setter(newSet);
  };

  const resetView = () => {
    if (!cy) return;
    cy.elements().show();
    cy.nodes().removeClass('faded highlighted');
    cy.edges().removeClass('faded');
    cy.nodes().unselect();
    cy.fit();
    setVisibleEdgeTypes(new Set(['BELONGS_TO_TOPIC', 'SHARED_TOPIC', 'CROSS_TOPIC_SIMILARITY']));
    setVisibleNodeTypes(new Set(['policy', 'strategy', 'cluster', 'research_theme', 'institution', 'topic']));
  };

  return (
    <Box
      component="aside"
      sx={{
        bgcolor:"rgba(25, 25, 25, 1)",
        width: 400,
        height: '100vh',
        p: 3,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        '&::-webkit-scrollbar': {
          width: '8px',
          paddingTop: '100px'
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: '#2e2e2e',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#888',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          backgroundColor: '#555',
        },
      }}
    >
      <Typography sx={{bgcolor:"rgba(25, 25, 25, 1)", color:'white', fontFamily: 'Segoe UI Emoji'}} variant="h6" fontWeight="bold">Graph Filters</Typography>

      {graphName === "HE_2025" || graphName === "Cluster_4" ? (
        <EdgeTypeToggle
          cy={cy}
          types={edgeTypeList}
          visibleTypes={visibleEdgeTypes}
          onToggle={(type) => toggleType(type, visibleEdgeTypes, setVisibleEdgeTypes, t => cy.edges(`[type = "${t}"]`))}
        />
      ) : null}
      {graphName === "HE_2025" || graphName === "Cluster_4" ? (
        <NodeTypeToggle
          cy={cy}
          types={nodeTypeList}
          visibleTypes={visibleNodeTypes}
          onToggle={(type) => toggleType(type, visibleNodeTypes, setVisibleNodeTypes, t => cy.nodes(`[type = "${t}"]`))}
        />
      ) : null}
    
      <SearchBox cy={cy} />

      {graphName === "HE_2025" && (
        <ScoreFilter cy={cy} />
      )}

      <Box>
        <button style={{backgroundColor:"rgba(25, 25, 25, 1)", color:'white'}}  className="btn btn-sm btn-outline-secondary" onClick={resetView}>Reset View</button>
      </Box>

      {hoveredNode && (
        <Box className="mt-3 mb-5 p-2 border rounded shadow-sm" sx={{backgroundColor: "rgba(64, 64, 64, 1)"}}>
          <Typography sx={{color:"white"}} variant="subtitle1" fontWeight="bold">Hovered Node</Typography>
          <Typography  sx={{color:"white"}} variant="body2"><strong>Label:</strong> {hoveredNode.label}</Typography>
          <Typography  sx={{color:"white"}} variant="body2"><strong>Type:</strong> {hoveredNode.type}</Typography>
          {hoveredNode.summary && (
            <Typography  variant="body2" sx={{color:"white", mt: 1 }}>
              <strong>Summary:</strong><br />{hoveredNode.summary}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Legend;