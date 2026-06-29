import React from "react";
import { Box, Chip } from "@mui/material";

/**
 * FundingFrameLegend — a tiny shared legend that frames the two funding measures used across the
 * dashboard. Work-programme money is *planned* (on offer); CORDIS money is *funded* (awarded).
 * Renders an outline "planned" chip + a filled "funded" chip and a one-line explanation.
 * Self-contained; accepts an optional className for layout.
 */
export default function FundingFrameLegend({ className }) {
  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 1,
        py: 0.5,
      }}
    >
      <Chip
        label="Planned — on offer (work programme)"
        size="small"
        variant="outlined"
        sx={{ fontWeight: 600, fontSize: "0.72rem" }}
      />
      <Chip
        label="Funded — awarded (CORDIS)"
        size="small"
        variant="filled"
        color="primary"
        sx={{ fontWeight: 600, fontSize: "0.72rem" }}
      />
      <Box
        component="span"
        sx={{
          fontSize: "0.74rem",
          color: "var(--muted-foreground, #94a3b8)",
        }}
      >
        Work programme = money on offer (planned); CORDIS = money actually funded (awarded).
      </Box>
    </Box>
  );
}
