import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';

const ScoreFilter = ({ cy }) => {
  const [minScore, setMinScore] = useState(0);

  const filterByScore = () => {
    if (!cy) return;
  
    // 1. Hide all edges first
    cy.edges().forEach(edge => edge.hide());
  
    // 2. Only show similarity edges above threshold
    const visibleEdges = cy.edges('[type = "CROSS_TOPIC_SIMILARITY"]').filter(edge => {
      const score = parseFloat(edge.data('score'));
      return !isNaN(score) && score >= minScore;
    });
    visibleEdges.forEach(edge => edge.show());
  
    // 3. Collect nodes connected by visible similarity edges
    const connectedNodes = new Set();
    visibleEdges.forEach(edge => {
      connectedNodes.add(edge.source().id());
      connectedNodes.add(edge.target().id());
    });
  
    // 4. Hide all nodes not connected to visible edges
    cy.nodes().forEach(node => {
      node.toggleClass('faded', !connectedNodes.has(node.id()));
    });
  };
  
  return (
    <Box sx={{mt:1}}>
      <Typography sx={{bgcolor:"rgba(25, 25, 25, 1)", color:'white'}} variant="subtitle1" fontWeight="medium">Min Similarity Score</Typography>
      <Slider
        value={minScore}
        step={0.01}
        min={0}
        max={1}
        onChange={(e, value) => setMinScore(value)}
        valueLabelDisplay="auto"
    
      />
      <Button
        sx={{bgcolor:"rgb(255, 115, 22)", color:'white'}}
        variant="outlined"
        size="small"
        onClick={filterByScore}
      >
        Apply Score Filter
      </Button>
    </Box>
  );
};

export default ScoreFilter;