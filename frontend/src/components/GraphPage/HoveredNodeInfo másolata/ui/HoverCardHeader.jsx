import React from "react";
import { Box, Typography } from "@mui/material";
import HoverCardChips from "./HoverCardChips";

/**
 * Header: dot + title + chips.
 *
 * Props:
 * - title: display title
 * - titleFull: optional full title for tooltip
 * - nodeVisual: { fill, borderColor, borderWidthPx }
 * - chips: passed through to HoverCardChips
 */
export default function HoverCardHeader({ title, titleFull, nodeVisual, chips }) {
  const dot = nodeVisual || {
    fill: "rgba(255,255,255,0.18)",
    borderColor: "#ffffff",
    borderWidthPx: 2,
  };

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, pr: 4 }}>
      <Box
        sx={{
          width: 14,
          height: 14,
          borderRadius: "999px",
          mt: "6px",
          backgroundColor: dot.fill,
          border: `${dot.borderWidthPx || 2}px solid ${dot.borderColor || "#fff"}`,
          flexShrink: 0,
        }}
      />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          className="hover-card-title"
          variant="subtitle1"
          sx={{ fontWeight: 700, lineHeight: 1.2, wordBreak: "break-word" }}
          title={titleFull || title || ""}
        >
          {title}
        </Typography>

        <HoverCardChips {...(chips || {})} />
      </Box>
    </Box>
  );
}
