import React from "react";
import { Box, Typography } from "@mui/material";
import MoneyBadge from "../../common/MoneyBadge";

// `badge` (optional) stamps the row's money with its half — "advertised" for the programme's
// indicative budget on offer (ADR-0006 #5). Non-money rows omit it.
export default function CompareMetricRow({ label, valueA, valueB, badge }) {
  return (
    <Box className="compare-drawer__metric-row">
      <Typography className="compare-drawer__metric-label">
        {label}
        {badge && <MoneyBadge kind={badge} size="sm" />}
      </Typography>
      <Typography className="compare-drawer__metric-value">{valueA}</Typography>
      <Typography className="compare-drawer__metric-value">{valueB}</Typography>
    </Box>
  );
}
