import React from "react";
import { Box, Chip, Divider, Typography } from "@mui/material";
import { truncate } from "../utils/nodeSafe";

/**
 * Renders a tag section with chips.
 * Props:
 * - title: string
 * - tags: string[]
 */
export default function TagChips({ title = "Related Topics", tags = [] }) {
  if (!tags?.length) return null;

  return (
    <>
      <Divider sx={{ my: 1.25, borderColor: "rgba(255,255,255,0.10)" }} />

      <Typography sx={{ fontSize: 12, fontWeight: 700, opacity: 0.9, mb: 0.75 }}>
        {title}
      </Typography>

      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
        {tags.slice(0, 12).map((t) => (
          <Chip
            key={t}
            size="small"
            label={truncate(t, 34)}
            title={t}
            sx={{
              height: 22,
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              color: "#fff",
            }}
          />
        ))}
      </Box>
    </>
  );
}
