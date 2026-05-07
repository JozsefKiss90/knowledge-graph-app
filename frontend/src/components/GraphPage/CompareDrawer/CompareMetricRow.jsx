import React from "react";
import { Box, Typography } from "@mui/material";

export default function CompareMetricRow({ label, valueA, valueB }) {
  return (
    <Box className="compare-drawer__metric-row">
      <Typography className="compare-drawer__metric-label">{label}</Typography>
      <Typography className="compare-drawer__metric-value">{valueA}</Typography>
      <Typography className="compare-drawer__metric-value">{valueB}</Typography>
    </Box>
  );
}
