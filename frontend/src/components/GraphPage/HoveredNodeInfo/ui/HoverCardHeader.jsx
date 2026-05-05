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
    fill: "hsla(71, 100%, 50%, 1.00)",
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
          backgroundColor: dot.fill,
          border: `${dot.borderWidthPx || 2}px solid ${dot.borderColor || "#fff"}`,
          cursor: onDotClick ? "pointer" : "default",
          flex: "0 0 auto",
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          className="hover-card-title"
          variant="subtitle1"
          onClick={onTitleClick}
          role={onTitleClick ? "button" : undefined}
          tabIndex={onTitleClick ? 0 : undefined}
          onKeyDown={(e) => {
            if (!onTitleClick) return;
            if (e.key === "Enter" || e.key === " ") onTitleClick();
         }}
         sx={{
           fontWeight: 700,
           lineHeight: 1.2,
           wordBreak: "break-word",
           cursor: onTitleClick ? "pointer" : "default",
           userSelect: "none",
           textDecoration: "none",
           "&:hover": onTitleClick
             ? { textDecoration: "underline", textUnderlineOffset: "3px" }
             : undefined,
         }}
          title={titleFull || title || ""}
        >
          {title}
        </Typography>

        <HoverCardChips {...(chips || {})} />
      </Box>
    </Box>
  );
}
