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

const Legend = ({ hoveredNodeRef }) => {
  const cy = useCy();
  const [hoveredNode, setHoveredNode] = useState(null);
  const [visibleEdgeTypes, setVisibleEdgeTypes] = useState(new Set(['BELONGS_TO_TOPIC', 'SHARED_TOPIC', 'CROSS_TOPIC_SIMILARITY']));
  const [visibleNodeTypes, setVisibleNodeTypes] = useState(new Set([
    'policy', 'strategy', 'cluster', 'research_theme', 'institution', 'topic'
  ]));

  useEffect(() => {
    const interval = setInterval(() => {
      setHoveredNode(hoveredNodeRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [hoveredNodeRef]);

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

      <EdgeTypeToggle
        cy={cy}
        visibleTypes={visibleEdgeTypes}
        onToggle={(type) => toggleType(type, visibleEdgeTypes, setVisibleEdgeTypes, t => cy.edges(`[type = "${t}"]`))}
      />

      <NodeTypeToggle
        cy={cy}
        visibleTypes={visibleNodeTypes}
        onToggle={(type) => toggleType(type, visibleNodeTypes, setVisibleNodeTypes, t => cy.nodes(`[type = "${t}"]`))}
      />

      <SearchBox cy={cy} />

      <ScoreFilter cy={cy} />

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