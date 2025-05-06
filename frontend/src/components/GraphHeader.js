import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Link } from 'react-router-dom';

const GraphHeader = () => {
  return (
    <Box
      component="header"
      sx={{
        backgroundColor: 'rgb(36, 36, 36)',
        color: 'white',
        py: 2,
        px: 3,
        display: 'flex',
        alignItems: 'center',
        boxShadow: 1,
      }}
    > 
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className='d-flex flex-row align-items-center'>
            <img
              src="/64px-Flag_of_Europe.svg.png"
              alt="EU Flag"
              style={{ height: 38, marginRight: 16 }}
            />
            <Typography sx={{fontFamily: 'Segoe UI Emoji'}} variant="h6" component="h1">
              EU Knowledge Graph
            </Typography>
          </div>
      </Link>
    </Box>
  );
};

export default GraphHeader;

