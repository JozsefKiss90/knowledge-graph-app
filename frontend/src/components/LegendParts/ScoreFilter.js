import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';

const ScoreFilter = ({ cy }) => {
  const [minScore, setMinScore] = useState(0);

  const filterByScore = () => {
    if (!cy) return;
    const visibleEdges = cy.edges('[type = "CROSS_TOPIC_SIMILARITY"]').filter(edge => {
      const score = parseFloat(edge.data('score'));
      return !isNaN(score) && score >= minScore;
    });
    cy.edges('[type = "CROSS_TOPIC_SIMILARITY"]').forEach(edge => edge.hide());
    visibleEdges.forEach(edge => edge.show());
    const connectedNodes = new Set();
    visibleEdges.forEach(edge => {
      connectedNodes.add(edge.source().id());
      connectedNodes.add(edge.target().id());
    });
    cy.nodes().forEach(node => {
      node.toggleClass('faded', !connectedNodes.has(node.id()));
    });
  };

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight="medium">Min Similarity Score</Typography>
      <Slider
        value={minScore}
        step={0.01}
        min={0}
        max={1}
        onChange={(e, value) => setMinScore(value)}
        valueLabelDisplay="auto"
        sx={{ mt: 2, mb: 1 }}
      />
      <Button
        variant="outlined"
        size="small"
        color="warning"
        onClick={filterByScore}
      >
        Apply Score Filter
      </Button>
    </Box>
  );
};

export default ScoreFilter;