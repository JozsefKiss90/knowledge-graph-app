import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useDarkMode } from '../context/DarkModeContext';


const SearchBox = ({ cy, showTitle = true }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { darkMode, setDarkMode } = useDarkMode();
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
      {showTitle && (
        <Typography className="legend-titles" variant="subtitle1" fontWeight="bold">
          Search Node
        </Typography>
      )}
      <TextField
        size="small"
        fullWidth
        margin="dense"
        placeholder="Call ID or label"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
        sx={{
          input: {
            color: darkMode ? 'white' : 'black',
            backgroundColor: darkMode ? 'rgb(43, 56, 65)' : 'white',
            border: `1px solid ${darkMode ? 'white' : 'black'}`,
            '::placeholder': {
              color: darkMode ? 'rgb(172, 206, 231)' : 'rgb(136, 136, 136)',
              opacity: 1,
            }
          }
        }}
      />
        <Button
        className="search-input"
        sx={{
          mt: 1,
          px: 2.5,
          borderRadius: 2,
          border: `1px solid ${darkMode ? "#ffffff" : "#000000"}`,
          backgroundColor: darkMode ? "transparent" : "#000000",
          color: darkMode ? "#ffffff" : "#ffffff",
          textTransform: "none",
          fontWeight: 500,
          "&:hover": {
            // invert: text and background swap
            backgroundColor: darkMode ? "#ffffff" : "transparent",
            color: darkMode ? "#000000" : "#000000",
            borderColor: darkMode ? "#ffffff" : "#000000",
          },
        }}
        variant="outlined"
        size="medium"
        onClick={handleSearch}
      >
        Search &amp; Highlight
      </Button>
    </Box>
  );
};

export default SearchBox;
