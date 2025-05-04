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
        width: 400,
        height: '100%',
        p: 3,
        overflowY: 'auto',
        borderRight: '1px solid #ddd',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Typography variant="h6" fontWeight="bold">Graph Filters</Typography>

      <EdgeTypeToggle
        cy={cy}
        visibleTypes={visibleEdgeTypes}
        onToggle={(type) => toggleType(type, visibleEdgeTypes, setVisibleEdgeTypes, t => cy.edges(`[type = "${t}"]`))}
      />

      <Divider />

      <NodeTypeToggle
        cy={cy}
        visibleTypes={visibleNodeTypes}
        onToggle={(type) => toggleType(type, visibleNodeTypes, setVisibleNodeTypes, t => cy.nodes(`[type = "${t}"]`))}
      />

      <Divider />

      <SearchBox cy={cy} />

      <ScoreFilter cy={cy} />

      <Divider />

      <Box>
        <button className="btn btn-sm btn-outline-secondary" onClick={resetView}>Reset View</button>
      </Box>

      {hoveredNode && (
        <Box className="mt-4 p-2 border rounded bg-white shadow-sm">
          <Typography variant="subtitle1" fontWeight="bold">Hovered Node</Typography>
          <Typography variant="body2"><strong>ID:</strong> {hoveredNode.id}</Typography>
          <Typography variant="body2"><strong>Label:</strong> {hoveredNode.label}</Typography>
          <Typography variant="body2"><strong>Type:</strong> {hoveredNode.type}</Typography>
          {hoveredNode.summary && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Summary:</strong><br />{hoveredNode.summary}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Legend;