import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

const EDGE_TITLES = {
  BELONGS_TO_TOPIC: "Toggle topic links",
  SHARED_TOPIC: "Toggle shared topics",
  CROSS_TOPIC_SIMILARITY: "Toggle similar topics",
  RELATES_TO: "Toggle relates-to links",
  WIKI_LINK: "Toggle wiki links",
};

const EdgeTypeToggle = ({ cy, types, visibleTypes, onToggle }) => {
  if (!visibleTypes || !types) return null;

  return (
    <Box>

      <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
        {types.map(({ type }) => {
          const classType = type.replace(/\s+/g, '').toLowerCase();
          const isActive = visibleTypes.has(type)
          return (
            <Button
              key={type}
              variant={isActive ? 'contained' : 'outlined'}
              size="small"
              disableElevation
              title={EDGE_TITLES[type] || `Toggle ${type.replaceAll('_', ' ').toLowerCase()}`}
              className={`edge-toggle-button type-${classType}${!isActive ? '-active' : ''}`}
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
