import React from "react";
import { Box, Button } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

/**
 * Centered "View Details" button.
 */
export default function ViewDetailsButton({ onClick }) {
  return (
    <Box sx={{ mt: 1.5, display: "flex", justifyContent: "center" }}>
      <Button
        size="small"
        variant="contained"
        startIcon={<OpenInNewIcon fontSize="small" />}
        onClick={onClick}
        sx={{
          borderRadius: 999,
          minWidth: 160,
          textTransform: "none",
          fontWeight: 700,
          backgroundColor: "var(--primary)",
          color: "var(--primary-foreground)",
          "&:hover": { backgroundColor: "var(--primary-dark)" },
        }}
      >
        View Details
      </Button>
    </Box>
  );
}
