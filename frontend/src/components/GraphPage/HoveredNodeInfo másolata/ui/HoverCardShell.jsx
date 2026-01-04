import React from "react";
import { Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/**
 * Presentational shell for the hover card.
 *
 * Props:
 * - positionStyle: { position:'fixed', left, top, zIndex } etc.
 * - cardRef: ref passed from useHoverCardMeasure/useHoverCardDrag
 * - onPointerDown: pointerdown handler to initiate dragging
 * - onClose: close handler
 * - maxHeight: css string for maxHeight
 */
export default function HoverCardShell({
  children,
  positionStyle,
  cardRef,
  onPointerDown,
  onClose,
  maxHeight = "min(520px, calc(100vh - 24px))",
}) {
  return (
    <Box
      ref={cardRef}
      className="hover-card"
      style={positionStyle}
      onPointerDown={onPointerDown}
      sx={{
        width: 360,
        maxWidth: "min(420px, calc(100vw - 24px))",
        maxHeight,
        overflow: "auto",
        borderRadius: "16px",
        background: "rgba(14, 16, 22, 0.94)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 18px 70px rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
        color: "#fff",
        p: 1.5,
        position: "fixed",
      }}
    >
      {/* Close button (top-right) */}
      <Box sx={{ position: "absolute", top: 6, right: 6, zIndex: 2 }}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose?.();
          }}
          sx={{
            color: "rgba(255,255,255,0.75)",
            "&:hover": { color: "#fff" },
          }}
          aria-label="Close"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ position: "relative" }}>{children}</Box>
    </Box>
  );
}
