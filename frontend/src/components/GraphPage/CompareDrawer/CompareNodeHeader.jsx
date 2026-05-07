import React from "react";
import { Box, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function CompareNodeHeader({ node, onClear }) {
  if (!node) return null;

  const label = node.label || node.name || node.title || node.id || "Unknown";
  const typeLabel = String(node.type || node.category || "Programme").replace(/^\w/, (c) =>
    c.toUpperCase()
  );

  const visual = node.nodeVisual || {
    fill: "#3d8fff",
    borderColor: "#fff",
    borderWidthPx: 2,
  };

  return (
    <Box className="compare-drawer__node-header">
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            backgroundColor: visual.fill,
            border: `${visual.borderWidthPx || 2}px solid ${visual.borderColor || "#fff"}`,
            flex: "0 0 auto",
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 13,
              lineHeight: 1.25,
              wordBreak: "break-word",
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--foreground-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              mt: 0.2,
            }}
          >
            {typeLabel} &middot; 2021-27
          </Typography>
        </Box>
        {onClear && (
          <IconButton
            size="small"
            onClick={onClear}
            sx={{
              width: 20,
              height: 20,
              color: "var(--foreground-muted)",
              "&:hover": { color: "var(--foreground)" },
            }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}
