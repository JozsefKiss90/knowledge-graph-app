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
        p: 1.5,

        backgroundColor: "var(--card)",
        color: "var(--card-foreground)",
        border: "1px solid var(--border)",
        boxShadow: "0 18px 44px rgba(2, 6, 23, 0.18), 0 6px 16px rgba(2, 6, 23, 0.12)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
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
            color: "var(--foreground-muted)",
            "&:hover": { color: "var(--foreground)" },
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
