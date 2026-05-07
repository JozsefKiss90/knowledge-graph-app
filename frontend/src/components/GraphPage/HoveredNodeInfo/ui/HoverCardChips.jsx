// ui/HoverCardChips.jsx
import React from "react";
import { Box, Chip } from "@mui/material";

const CALL_STATUS_STYLES = {
  open: { backgroundColor: "rgba(76, 175, 80, 0.15)", color: "#4caf50", label: "Open" },
  forthcoming: { backgroundColor: "rgba(255, 193, 7, 0.15)", color: "#ffc107", label: "Forthcoming" },
  closed: { backgroundColor: "rgba(244, 67, 54, 0.15)", color: "#f44336", label: "Closed" },
};

export default function HoverCardChips({
  typeLabel,
  showType = true,
  showPinned = false,

  callStatus = null,

  showCallCount = false,
  callCount = null,
  callLabel = "Open Calls",

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
          backgroundColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
          color: "var(--primary-dark)",
        }}
      />
    );
  }

  if (callStatus && CALL_STATUS_STYLES[callStatus]) {
    const s = CALL_STATUS_STYLES[callStatus];
    chips.push(
      <Chip
        key="callStatus"
        label={s.label}
        size="small"
        sx={{
          height: 22,
          fontSize: "0.7rem",
          fontWeight: 600,
          borderRadius: "999px",
          backgroundColor: s.backgroundColor,
          color: s.color,
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
          backgroundColor: "var(--muted)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        }}
      />
    );
  }

  if (showCallCount && typeof callCount === "number") {
    chips.push(
      <Chip
        key="callCount"
        label={`${callCount.toLocaleString()} ${callLabel}`}
        size="small"
        sx={{
          height: 22,
          fontSize: "0.7rem",
          fontWeight: 600,
          borderRadius: "999px",
          backgroundColor: "var(--muted)",
          border: "1px solid var(--border)",
          color: "#4caf50",
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
          backgroundColor: "var(--muted)",
          border: "1px solid var(--border)",
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
