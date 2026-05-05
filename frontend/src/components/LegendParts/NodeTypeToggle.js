import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

const normalizeTypeClass = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/\s+/g, "_");

const resolveTypeClass = (type, label) => {
  const t = normalizeTypeClass(type);
  const l = normalizeTypeClass(label);

  if (t === "root" && l === "programme") return "programme";
  if (t === "root" && l === "funding_programmes") return "meta";
  return t;
};

const NodeTypeToggle = ({ types, visibleTypes, onToggle }) => (
  <Box>
    <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
      {types.map((item) => {
        const type = item.type;
        const isActive = visibleTypes.has(type);
        const label = typeof item.label === "string" ? item.label : type;
        const typeClass = resolveTypeClass(type, label);

        return (
          <Button
            key={type}
            variant="contained"
            size="small"
            disableElevation
            onClick={() => onToggle(type)}
            className={`node-toggle-button type-${typeClass}${isActive ? "" : ` type-${typeClass}-active`}`}
          >
            {label.replaceAll("_", " ")}
          </Button>
        );
      })}
    </Box>
  </Box>
);

export default NodeTypeToggle;