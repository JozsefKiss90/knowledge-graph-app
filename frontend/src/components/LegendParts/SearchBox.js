import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

const SearchBox = ({ cy }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    if (!cy || !searchTerm.trim()) return;
    const term = searchTerm.toLowerCase();
    const matched = cy.nodes().filter(n =>
      n.data('id')?.toLowerCase().includes(term) ||
      n.data('label')?.toLowerCase().includes(term)
    );
    cy.nodes().removeClass('faded highlighted');
    cy.edges().removeClass('faded');
    if (matched.length > 0) {
      cy.nodes().difference(matched).addClass('faded');
      cy.edges().addClass('faded');
      matched.addClass('highlighted');
      matched.connectedEdges().removeClass('faded');
    }
  };

  return (
    <Box>
      <Typography sx={{ color: 'white' }} variant="subtitle1" fontWeight="bold">Search Node</Typography>
      <TextField
        size="small"
        fullWidth
        margin="dense"
        placeholder="Node ID or label"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          sx: {
            color: 'white',
            backgroundColor: '#2e2e2e',
            '& input::placeholder': {
              color: 'white',
              opacity: 1, // Important: ensure it's visible
            },
          },
        }}
      />

      <Button
        sx={{bgcolor:"rgb(28, 81, 255)", color:'white', mt: 1 }}
        variant="outlined"
        size="small"
        onClick={handleSearch}
      >
        Search & Highlight
      </Button>
    </Box>
  );
};

export default SearchBox;