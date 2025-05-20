import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';


const EdgeTypeToggle = ({ cy, types, visibleTypes, onToggle }) => (
  <Box>
    <Typography  sx={{color:'white'}} variant="subtitle1" fontWeight="bold">Edge Types</Typography>
    <Box display="flex" gap={1} flexWrap="wrap" sx={{mt: 1}}>
      {types.map(({ type, color }) => (
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