import React from "react";
import { Box, Typography } from "@mui/material";

/**
 * CordisEmptyState — a low-key, muted placeholder for CORDIS / topic panels that
 * have no real data yet. Honest framing: it tells the user that real data will
 * appear here once it's available, WITHOUT leaking backend/dev jargon
 * (no "run /cordis/tag-calls", no endpoint names).
 *
 * Props:
 *   title    — optional short heading (omitted when not provided)
 *   message  — optional body text; ignored when `children` is supplied
 *   children — optional custom body content (overrides `message`)
 *   compact  — when true, renders a tighter, lower-emphasis variant
 *   variant  — string alias for callers that prefer a flag ("compact")
 *   className — optional extra class for layout tweaks
 */
export default function CordisEmptyState({
  title,
  message,
  children,
  compact = false,
  variant,
  className = "",
}) {
  const isCompact = compact || variant === "compact";
  const body = children || message;

  return (
    <Box
      className={`cordis-empty-state${isCompact ? " cordis-empty-state--compact" : ""}${
        className ? ` ${className}` : ""
      }`}
      sx={{
        px: isCompact ? 1 : 1.5,
        py: isCompact ? 1 : 1.5,
        borderRadius: "8px",
        border: "1px dashed var(--border)",
        backgroundColor: "var(--muted)",
        color: "var(--foreground-muted)",
      }}
    >
      {title ? (
        <Typography
          variant="body2"
          sx={{
            fontSize: isCompact ? 12 : 13,
            fontWeight: 600,
            color: "var(--foreground-muted)",
            mb: 0.5,
          }}
        >
          {title}
        </Typography>
      ) : null}
      {body ? (
        <Typography
          sx={{
            fontSize: isCompact ? 11 : 12,
            lineHeight: 1.5,
            color: "var(--foreground-muted)",
          }}
        >
          {body}
        </Typography>
      ) : null}
    </Box>
  );
}
