import React from "react";
import { Box, Chip } from "@mui/material";

/**
 * Small chips under the title.
 *
 * Props:
 * - typeLabel: string
 * - showType: boolean
 * - showCallCount: boolean
 * - callCount: number
 * - showPinned: boolean
 */
export default function HoverCardChips({
  typeLabel,
  showType = true,
  showCallCount = false,
  callCount = 0,
  showPinned = false,
}) {
  const hasAny = (showType && !!typeLabel) || showCallCount || showPinned;
  if (!hasAny) return null;

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.75 }}>
      {showType && !!typeLabel && (
        <Chip
          size="small"
          label={typeLabel}
          sx={{
            height: 22,
            borderRadius: 999,
            fontWeight: 700,
            background: "rgba(255,255,255,0.10)",
            color: "#fff",
          }}
        />
      )}

      {showCallCount && (
        <Chip
          size="small"
          label={`${callCount} Calls`}
          sx={{
            height: 22,
            borderRadius: 999,
            fontWeight: 700,
            background: "rgba(255,255,255,0.10)",
            color: "#fff",
          }}
        />
      )}

      {showPinned && (
        <Chip
          size="small"
          label="Pinned"
          sx={{
            height: 22,
            borderRadius: 999,
            fontWeight: 700,
            background: "rgba(120, 255, 214, 0.14)",
            color: "#bfffe7",
          }}
        />
      )}
    </Box>
  );
}
