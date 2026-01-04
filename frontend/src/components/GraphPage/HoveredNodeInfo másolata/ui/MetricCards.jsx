import React from "react";
import { Box, Divider, Typography } from "@mui/material";

/**
 * Renders metric cards in a grid.
 *
 * Item shape:
 * - key: string
 * - label: string
 * - value: string|number
 * - variant: 'number' | 'text' (optional)
 * - fullWidth: boolean (optional)
 */
export default function MetricCards({ items = [] }) {
  if (!items?.length) return null;

  // If any item is fullWidth, render it as its own row.
  const fullWidthItems = items.filter((i) => i?.fullWidth);
  const gridItems = items.filter((i) => !i?.fullWidth);

  return (
    <>
      <Divider sx={{ my: 1.25, borderColor: "rgba(255,255,255,0.10)" }} />

      {gridItems.length > 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
          {gridItems.map((m) => (
            <Box
              key={m.key || m.label}
              sx={{
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.06)",
                p: 1,
              }}
            >
              <Typography sx={{ fontSize: 11, opacity: 0.8, fontWeight: 700 }}>
                {m.label}
              </Typography>
              <Typography
                sx={{
                  mt: 0.35,
                  fontWeight: 800,
                  fontSize: m.variant === "text" ? 12.5 : 18,
                  lineHeight: 1.35,
                  wordBreak: "break-word",
                }}
              >
                {m.value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {fullWidthItems.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: gridItems.length ? 1 : 0 }}>
          {fullWidthItems.map((m) => (
            <Box
              key={m.key || m.label}
              sx={{
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.06)",
                p: 1,
              }}
            >
              <Typography sx={{ fontSize: 11, opacity: 0.8, fontWeight: 700 }}>
                {m.label}
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  fontWeight: 600,
                  fontSize: 12.5,
                  opacity: 0.92,
                  lineHeight: 1.45,
                  wordBreak: "break-word",
                }}
              >
                {m.value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </>
  );
}
