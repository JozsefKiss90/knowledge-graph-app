import React from "react";
import { Box, Button, Divider } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

/**
 * Consistent "View Details" CTA.
 * Props:
 * - onClick: () => void
 * - label: optional string
 */
export default function ViewDetailsButton({ onClick, label = "View Details" }) {
  return (
    <>
      <Divider sx={{ my: 1.25, borderColor: "rgba(255,255,255,0.10)" }} />
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          size="small"
          startIcon={<OpenInNewIcon fontSize="small" />}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick?.();
          }}
          sx={{
            borderRadius: 999,
            textTransform: "none",
            fontWeight: 600,
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            "&:hover": { backgroundColor: "var(--primary-dark)" },
          }}
        >
          {label} 
        </Button>
      </Box>
    </>
  );
}
