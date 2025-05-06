import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

const NODE_TYPES = [
  { type: 'policy', color: '#00bcd4' },
  { type: 'strategy', color: '#4caf50' },
  { type: 'cluster', color: '#ff7043' },
  { type: 'research_theme', color: '#ffb300' },
  { type: 'institution', color: '#9c27b0' },
  { type: 'topic', color: '#ffc107' }
];

const NodeTypeToggle = ({ cy, visibleTypes, onToggle }) => (
  <Box>
    <Typography  sx={{bgcolor:"rgba(25, 25, 25, 1)", color:'white'}} variant="subtitle1" fontWeight="bold">Node Types</Typography>
    <Box display="flex" gap={1} flexWrap="wrap" sx={{mt: 1}}>
      {NODE_TYPES.map(({ type, color }) => (
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
          {type.replace('_', ' ')}
        </Button>
      ))}
    </Box>
  </Box>
);

export default NodeTypeToggle;