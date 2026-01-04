// ui/HoverCardChips.jsx
import React from "react";
import { Box, Chip } from "@mui/material";

export default function HoverCardChips({
  typeLabel,
  showType = true,
  showPinned = false,

  showCallCount = false,
  callCount = null,

  showDestCount = false,
  destCount = null,
  destLabel = "Destinations",

  showNodeCount = false,
  nodeCount = null,
  nodeLabel = "Nodes",
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
          backgroundColor: "rgba(74, 158, 255, 0.12)",
          color: "var(--primary)",
        }}
      />
    );
  }

  // IMPORTANT: render NodeCount in addition to Call/Destination counts (not mutually exclusive)
  if (showNodeCount && typeof nodeCount === "number") {
    chips.push(
      <Chip
        key="nodeCount"
        label={`${nodeCount.toLocaleString()} ${nodeLabel}`}
        size="small"
        sx={{
          height: 22,
          fontSize: "0.7rem",
          fontWeight: 600,
          borderRadius: "999px",
          backgroundColor: "rgba(255,255,255,0.08)",
          color: "var(--foreground)",
        }}
      />
    );
  }

  if (showCallCount && typeof callCount === "number") {
    chips.push(
      <Chip
        key="callCount"
        label={`${callCount.toLocaleString()} Calls`}
        size="small"
        sx={{
          height: 22,
          fontSize: "0.7rem",
          fontWeight: 600,
          borderRadius: "999px",
          backgroundColor: "rgba(255,255,255,0.08)",
          color: "var(--foreground)",
        }}
      />
    );
  }

  if (showDestCount && typeof destCount === "number") {
    chips.push(
      <Chip
        key="destCount"
        label={`${destCount.toLocaleString()} ${destLabel}`}
        size="small"
        sx={{
          height: 22,
          fontSize: "0.7rem",
          fontWeight: 600,
          borderRadius: "999px",
          backgroundColor: "rgba(255,255,255,0.08)",
          color: "var(--foreground)",
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
          fontWeight: 700,
          borderRadius: "999px",
          backgroundColor: "rgba(255, 193, 7, 0.18)",
          color: "var(--foreground)",
        }}
      />
    );
  }

  if (chips.length === 0) return null;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
      {chips}
    </Box>
  );
}
