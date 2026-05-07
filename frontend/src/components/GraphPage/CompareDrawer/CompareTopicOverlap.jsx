import React, { useState } from "react";
import { Box, Chip, Typography } from "@mui/material";

export default function CompareTopicOverlap({ sharedTopics = [], topOverlap = [] }) {
  const [showAll, setShowAll] = useState(false);

  const displayedTopics = showAll ? sharedTopics : topOverlap;
  const hasMore = sharedTopics.length > topOverlap.length;

  if (!sharedTopics.length && !topOverlap.length) {
    return (
      <Box sx={{ mt: 1.5 }}>
        <Typography className="compare-drawer__metric-label">SHARED TOPICS</Typography>
        <Typography sx={{ fontSize: 12, color: "var(--foreground-muted)", mt: 0.5 }}>
          No shared topics found
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography className="compare-drawer__metric-label">SHARED TOPICS</Typography>
        {hasMore && (
          <Typography
            component="button"
            onClick={() => setShowAll((prev) => !prev)}
            sx={{
              fontSize: 11,
              color: "var(--primary)",
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 0,
              fontWeight: 600,
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {showAll ? "Show top 5" : `All in common (${sharedTopics.length})`}
          </Typography>
        )}
      </Box>

      <Typography
        className="compare-drawer__metric-label"
        sx={{ mt: 1.25, mb: 0.75, fontSize: "10px !important" }}
      >
        TOPIC OVERLAP {showAll ? "" : "- TOP 5"}
      </Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {displayedTopics.map((topic) => (
          <Chip
            key={topic}
            label={topic}
            size="small"
            sx={{
              height: 22,
              fontSize: 11,
              fontWeight: 500,
              backgroundColor: "var(--muted)",
              color: "var(--card-foreground)",
              borderRadius: "6px",
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
