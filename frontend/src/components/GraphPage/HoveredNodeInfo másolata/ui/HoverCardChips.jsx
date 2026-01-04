import React from "react";
import { Box, Chip } from "@mui/material";

export default function HoverCardChips({
  typeLabel,
  showType = true,
  showPinned = false,
  showCallCount = false,
  callCount,
  showDestCount = false,
  destCount,
  destLabel = "Destinations",
}) {
  const chips = [];

  if (showType && typeLabel) {
    chips.push(
      <Chip
        key="type"
        label={typeLabel}
        size="small"
        sx={{
          height: 22,
          fontSize: "0.7rem",
          fontWeight: 600,
          borderRadius: "999px",
          backgroundColor: "rgba(74, 158, 255, 0.1)",
          color: "var(--primary)",
        }}
      />
    );
  }

  if (showPinned) {
    chips.push(
      <Chip
        key="pinned"
        label="Pinned"
        size="small"
        sx={{
          height: 22,
          fontSize: "0.7rem",
          fontWeight: 600,
          borderRadius: "999px",
          backgroundColor: "rgba(0,0,0,0.06)",
          color: "var(--foreground)",
        }}
      />
    );
  }

  if (showCallCount && typeof callCount === "number") {
    chips.push(
      <Chip
        key="calls"
        label={`${callCount.toLocaleString()} Calls`}
        size="small"
        sx={{
          height: 22,
          fontSize: "0.7rem",
          fontWeight: 600,
          borderRadius: "999px",
          backgroundColor: "rgba(0,0,0,0.06)",
          color: "var(--foreground)",
        }}
      />
    );
  }

  if (showDestCount && typeof destCount === "number") {
    chips.push(
      <Chip
        key="destinations"
        label={`${destCount.toLocaleString()} ${destLabel}`}
        size="small"
        sx={{
          height: 22,
          fontSize: "0.7rem",
          fontWeight: 600,
          borderRadius: "999px",
          backgroundColor: "rgba(0,0,0,0.06)",
          color: "var(--foreground)",
        }}
      />
    );
  }

  if (chips.length === 0) return null;

  return (
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
      {chips}
    </Box>
  );
}
