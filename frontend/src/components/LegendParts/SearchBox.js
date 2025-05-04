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
      <Typography variant="subtitle1" fontWeight="medium">Search Node</Typography>
      <TextField
        size="small"
        fullWidth
        margin="dense"
        placeholder="Node ID or label"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Button
        variant="outlined"
        size="small"
        sx={{ mt: 1 }}
        onClick={handleSearch}
      >
        Search & Highlight
      </Button>
    </Box>
  );
};

export default SearchBox;