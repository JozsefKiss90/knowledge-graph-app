import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import '../../styles/main.scss';

const EdgeTypeToggle = ({ cy, types, visibleTypes, onToggle }) => {
  if (!visibleTypes || !types) return null;

  return (
    <Box>
      <Typography sx={{ color: 'white' }} variant="subtitle1" fontWeight="bold">
        Edge Types
      </Typography>
      <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
        {types.map(({ type }) => {
          const isActive = visibleTypes.has(type);
          const classType = type.replace(/\s+/g, '');

          return (
            <Button
              key={type}
              variant={isActive ? 'contained' : 'outlined'}
              size="small"
              disableElevation
className={`node-toggle-button type-${classType}${isActive ? '-active' : ''}`}
              onClick={() => onToggle(type)}
              onMouseEnter={() => {
                if (cy) {
                  cy.edges().forEach(edge => {
                    const match = edge.data('type') === type;
                    edge.toggleClass('highlighted', match);
                    edge.toggleClass('faded', !match);
                  });
                }
              }}
              onMouseLeave={() => {
                if (cy) {
                  cy.edges().removeClass('highlighted faded');
                }
              }}
            >
              {type.replaceAll('_', ' ')}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
};

export default EdgeTypeToggle;
