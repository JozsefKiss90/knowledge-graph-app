import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import '../../styles/main.scss';

const NodeTypeToggle = ({ cy, types, visibleTypes, onToggle }) => (

  <Box>
    <Typography sx={{ color: 'white' }} variant="subtitle1" fontWeight="bold">
      Node Types
    </Typography>
    <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
      {types.map(({ type }) => {
        if (!visibleTypes || !types) return null;
        const classType = type.replace(/\s+/g, '');
        const isActive = visibleTypes.has(type);
        return (
          <Button
            key={type}
            variant={isActive ? 'contained' : 'outlined'}
            size="small"
            disableElevation
            className={`node-toggle-button type-${classType}${!isActive ? '-active' : ''}`}
            onClick={() => onToggle(type)}
            onMouseEnter={() => {
              if (cy) {
                const nodes = cy.nodes();
                const edges = cy.edges();
                const highlightedNodeIds = new Set();

                nodes.forEach(node => {
                  const match = (node.data('type') || '').toLowerCase() === type.toLowerCase();
                  node.toggleClass('highlighted', match);
                  node.toggleClass('faded', !match);
                  if (match) highlightedNodeIds.add(node.id());
                });

                edges.forEach(edge => {
                  const src = edge.source().id();
                  const tgt = edge.target().id();
                  const connected = highlightedNodeIds.has(src) || highlightedNodeIds.has(tgt);
                  edge.toggleClass('faded', !connected);
                });
              }
            }}
            onMouseLeave={() => {
              if (cy) {
                cy.nodes().removeClass('highlighted faded');
                cy.edges().removeClass('faded');
              }
            }}
          >
            {type.replace('_', ' ')}
          </Button>
        );
      })}
    </Box>
  </Box>
);

export default NodeTypeToggle;
