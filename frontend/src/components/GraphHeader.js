import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

const GraphHeader = () => {
  return (
    <Box
      component="header"
      sx={{
        backgroundColor: 'primary.main',
        color: 'white',
        py: 2,
        px: 3,
        display: 'flex',
        alignItems: 'center',
        boxShadow: 1,
      }}
    >
      <img
        src="/64px-Flag_of_Europe.svg.png"
        alt="EU Flag"
        style={{ height: 32, marginRight: 16 }}
      />
      <Typography variant="h6" component="h1">
        EU Knowledge Graph
      </Typography>
    </Box>
  );
};

export default GraphHeader;

