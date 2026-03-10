import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useDarkMode } from '../context/DarkModeContext';


const SearchBox = ({ cy, showTitle = true }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { darkMode } = useDarkMode();
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
        className="search-button"
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
          className="search-button"
          sx={{
            mt: 1,
            px: 2,
            py: 0.5,
            minHeight: 36,
            borderRadius: "12px",
            border: darkMode ? "1px solid rgba(90, 200, 255, 0.75)" : "1px solid rgba(37, 99, 235, 0.55)",
            background: darkMode
              ? "linear-gradient(180deg, rgba(31,144,255,0.28) 0%, rgba(0,212,255,0.18) 100%)"
              : "linear-gradient(180deg, rgba(37,99,235,0.96) 0%, rgba(14,165,233,0.92) 100%)",
            color: "#ffffff",
            textTransform: "none",
            fontWeight: 600,
            letterSpacing: "0.02em",
            boxShadow: darkMode
              ? "0 0 0 1px rgba(100,190,255,0.18), 0 0 14px rgba(0,180,255,0.22), inset 0 1px 0 rgba(255,255,255,0.12)"
              : "0 6px 18px rgba(37,99,235,0.22), inset 0 1px 0 rgba(255,255,255,0.16)",
            transition: "all 180ms ease",
            "&:hover": {
              background: darkMode
                ? "linear-gradient(180deg, rgba(48,166,255,0.40) 0%, rgba(34,211,238,0.26) 100%)"
                : "linear-gradient(180deg, rgba(29,78,216,1) 0%, rgba(2,132,199,0.96) 100%)",
              borderColor: darkMode ? "rgba(120,220,255,0.95)" : "rgba(29,78,216,0.85)",
              boxShadow: darkMode
                ? "0 0 0 1px rgba(120,220,255,0.24), 0 0 18px rgba(34,211,238,0.32), inset 0 1px 0 rgba(255,255,255,0.16)"
                : "0 10px 24px rgba(37,99,235,0.28), inset 0 1px 0 rgba(255,255,255,0.18)",
              transform: "translateY(-1px)",
            },
            "&:active": {
              transform: "translateY(0)",
              boxShadow: darkMode
                ? "0 0 0 1px rgba(120,220,255,0.18), 0 0 10px rgba(34,211,238,0.18), inset 0 1px 2px rgba(0,0,0,0.35)"
                : "0 4px 10px rgba(37,99,235,0.20), inset 0 1px 2px rgba(0,0,0,0.16)",
            },
            "&.Mui-disabled": {
              opacity: 0.5,
              color: "rgba(255,255,255,0.7)",
              borderColor: "rgba(255,255,255,0.18)",
              boxShadow: "none",
            },
          }}
          variant="contained"
          size="medium"
          onClick={handleSearch}
        >
          Search &amp; Highlight
        </Button>
    </Box>
  );
};

export default SearchBox;
