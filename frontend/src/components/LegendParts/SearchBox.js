import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { useDarkMode } from '../context/DarkModeContext';


const asText = (v) => {
  if (v == null) return '';
  if (Array.isArray(v)) return v.join(' ');
  return String(v);
};

const SearchBox = ({ cy, showTitle = true, graphName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [matchIds, setMatchIds] = useState([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const { darkMode } = useDarkMode();
  const isHEWiki = graphName === 'HE_2025';
  const handleSearch = () => {
    if (!cy || !searchTerm.trim()) return;
    const term = searchTerm.toLowerCase();
    // Match id/label plus HE Wiki content fields (name, keywords, aliases, summary, body).
    // Cluster nodes lack these fields, so the extra checks are harmless there.
    const matched = cy.nodes().filter((n) => {
      const haystack = [
        n.data('id'),
        n.data('label'),
        n.data('name'),
        n.data('keywords'),
        n.data('related_topics'),
        n.data('aliases'),
        n.data('summary'),
        n.data('body'),
      ]
        .map(asText)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
    cy.nodes().removeClass('faded highlighted');
    cy.edges().removeClass('faded');
    setHasSearched(true);
    if (matched.length > 0) {
      cy.nodes().difference(matched).addClass('faded');
      cy.edges().addClass('faded');
      matched.addClass('highlighted');
      matched.connectedEdges().removeClass('faded');
      const ids = matched.map((n) => n.id());
      setMatchIds(ids);
      setMatchIndex(0);
      try {
        cy.animate({ fit: { eles: matched, padding: 80 }, duration: 350 });
      } catch {}
    } else {
      setMatchIds([]);
      setMatchIndex(0);
    }
  };

  const goToMatch = (nextIndex) => {
    if (!cy || matchIds.length === 0) return;
    const count = matchIds.length;
    const wrapped = ((nextIndex % count) + count) % count;
    setMatchIndex(wrapped);
    const node = cy.getElementById(matchIds[wrapped]);
    if (node.length > 0) {
      try {
        cy.animate({ fit: { eles: node, padding: 160 }, duration: 300 });
      } catch {}
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setMatchIds([]);
    setMatchIndex(0);
    setHasSearched(false);
    if (cy) {
      cy.nodes().removeClass('faded highlighted');
      cy.edges().removeClass('faded');
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
        placeholder={isHEWiki ? "Name, keyword, alias, text…" : "Call ID or label"}
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

        {hasSearched && matchIds.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, color: darkMode ? 'white' : 'black' }}>
            <Typography variant="caption" sx={{ flexGrow: 1 }}>{matchIndex + 1} of {matchIds.length}</Typography>
            <IconButton size="small" aria-label="Previous match" onClick={() => goToMatch(matchIndex - 1)} sx={{ color: 'inherit' }}><ChevronLeftIcon fontSize="small" /></IconButton>
            <IconButton size="small" aria-label="Next match" onClick={() => goToMatch(matchIndex + 1)} sx={{ color: 'inherit' }}><ChevronRightIcon fontSize="small" /></IconButton>
            <IconButton size="small" aria-label="Clear search" onClick={clearSearch} sx={{ color: 'inherit' }}><CloseIcon fontSize="small" /></IconButton>
          </Box>
        )}

        {hasSearched && matchIds.length === 0 && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: darkMode ? 'rgb(172, 206, 231)' : 'rgb(136, 136, 136)' }}>No matches found</Typography>
            <Button size="small" onClick={clearSearch} sx={{ textTransform: 'none', minWidth: 'auto', color: darkMode ? 'white' : 'black' }}>Clear</Button>
          </Box>
        )}
    </Box>
  );
};

export default SearchBox;
