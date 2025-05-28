import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Slider, { SliderThumb, SliderValueLabelProps } from '@mui/material/Slider';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import '../../styles/main.scss';

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
  
  const PrettoSlider = styled(Slider)({
    color: 'rgb(0, 151, 189)',
    height: 8,
    '& .MuiSlider-track': {
      border: 'none',
    },
    '& .MuiSlider-thumb': {
      height: 24,
      width: 24,
      backgroundColor: '#fff',
      border: '2px solid currentColor',
      '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
        boxShadow: 'inherit',
      },
      '&::before': {
        display: 'none',
      },
    },
    '& .MuiSlider-valueLabel': {
      lineHeight: 1.2,
      fontSize: 12,
      background: 'unset',
      padding: 0,
      width: 32,
      height: 32,
      borderRadius: '50% 50% 50% 0',
      backgroundColor: 'rgb(0, 159, 199)',
      transformOrigin: 'bottom left',
      transform: 'translate(50%, -100%) rotate(-45deg) scale(0)',
      '&::before': { display: 'none' },
      '&.MuiSlider-valueLabelOpen': {
        transform: 'translate(50%, -100%) rotate(-45deg) scale(1)',
      },
      '& > *': {
        transform: 'rotate(45deg)',
      },
    },
  });

  return (
    <Box sx={{mt:1}}>
      <Typography className="legend-titles" variant="subtitle1" fontWeight="bold">Min Similarity Score</Typography>
      {cy && (
      <PrettoSlider
        valueLabelDisplay="auto"
        aria-label="pretto slider"
        value={minScore}
        step={0.01}
        min={0}
        max={1}
        onChange={(e, value) => setMinScore(value)}
        />
      )}
      <Button
        sx={{bgcolor:"rgb(0, 151, 189)", color:'white'}}
        variant="outlined"
        size="medium"
        onClick={filterByScore}
      >
        Apply Score Filter
      </Button>
    </Box>
  );
};

export default ScoreFilter;