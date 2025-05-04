import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

const EDGE_TYPES = [
  { type: 'BELONGS_TO_TOPIC', color: '#4caf50' },
  { type: 'SHARED_TOPIC', color: '#2196f3' },
  { type: 'CROSS_TOPIC_SIMILARITY', color: '#ff9800' }
];

const EdgeTypeToggle = ({ cy, visibleTypes, onToggle }) => (
  <Box>
    <Typography variant="subtitle1" fontWeight="medium">Edge Types</Typography>
    <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
      {EDGE_TYPES.map(({ type, color }) => (
        <Button
          key={type}
          variant={visibleTypes.has(type) ? "contained" : "outlined"}
          size="small"
          onClick={() => onToggle(type)}
          sx={{
            borderColor: color,
            color: visibleTypes.has(type) ? 'white' : color,
            backgroundColor: visibleTypes.has(type) ? color : 'transparent',
            '&:hover': {
              backgroundColor: visibleTypes.has(type) ? color : '#f5f5f5'
            }
          }}
        >
          {type.replaceAll('_', ' ')}
        </Button>
      ))}
    </Box>
  </Box>
);

export default EdgeTypeToggle;