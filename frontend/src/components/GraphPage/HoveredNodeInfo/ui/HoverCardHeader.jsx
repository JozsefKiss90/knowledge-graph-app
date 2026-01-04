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
export default function HoverCardHeader({
  title,
  titleFull,
  nodeVisual,
  chips,
  onTitleClick,
  onDotClick,
}) {

  const dot = nodeVisual || {
    fill: "rgba(255,255,255,0.18)",
    borderColor: "#ffffff",
    borderWidthPx: 2,
  };

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, pr: 4 }}>
      <Box
      onClick={onDotClick}
      role={onDotClick ? "button" : undefined}
      tabIndex={onDotClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onDotClick) return;
        if (e.key === "Enter" || e.key === " ") onDotClick();
      }}
      sx={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        backgroundColor: nodeVisual?.fill,
        border: `${nodeVisual?.borderWidthPx || 2}px solid ${nodeVisual?.borderColor || "#fff"}`,
        cursor: onDotClick ? "pointer" : "default",
        flex: "0 0 auto",
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
