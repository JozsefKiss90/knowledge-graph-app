import { Box, Typography } from "@mui/material";

const SUMMARY_PREVIEW_LIMIT = 220;

// Only relevant call details
const DETAIL_KEYS = [
  "call_id",
  "type_of_action",
  "status",
  "deadline_model",
  "technology_readiness_level",
  "min_contribution",
  "max_contribution",
  "expected_eu_contribution",
  "indicative_budget",
  "indicative_number_of_projects",
  "opening_date",
  "deadline",
  "funding_link",
];

const PLACEHOLDER = "—";

const formatLabel = (key) =>
  key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Call Id", "Call ID");

const formatBaseValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : value;
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
};

// Extract first number from text (for TRL or millions)
function parseNumber(text) {
  if (!text) return null;
  const match = String(text).match(/(\d+[.,]?\d*)/);
  if (!match) return null;
  const num = parseFloat(match[1].replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

// Format and compute derived values
const formatFieldValue = (key, rawValue, node) => {
  // Technology Readiness Level (TRL)
  if (key === "technology_readiness_level") {
    if (typeof rawValue === "string" && rawValue.trim().length > 0) {
      const trlMatch = rawValue.match(/trl\s*(\d+)/i) || rawValue.match(/(\d+)/);
      return trlMatch ? `TRL ${trlMatch[1]}` : PLACEHOLDER;
    }
    return PLACEHOLDER;
  }

  // Append "million" for certain numeric fields
  if (["min_contribution", "max_contribution", "indicative_budget"].includes(key)) {
    const num = parseNumber(rawValue);
    return num != null ? `${num.toLocaleString()} million` : PLACEHOLDER;
  }

  // Derived "Indicative Number Of Projects" = indicative_budget / expected_eu_contribution
  if (key === "indicative_number_of_projects") {
    const total = parseNumber(node.indicative_budget);
    const eu = parseNumber(node.expected_eu_contribution);
    if (total && eu && eu > 0) {
      const result = Math.round(total / eu);
      return result.toLocaleString();
    }
    return PLACEHOLDER;
  }

  const base = formatBaseValue(rawValue);
  return base === "" ? PLACEHOLDER : base;
};

const HoveredNodeInfo = ({ node }) => {
  if (!node) return null;

  const isCallNode = node.type === "Call";
  const rawStatus = (node.status || "").trim();
  const isStatusOpen = rawStatus.toLowerCase() === "open";
  const shouldShowStatus = isStatusOpen;
  const shouldShowDatesAndLink = !rawStatus || isStatusOpen;

  // Prepare Call ID from backend id if call_id missing
  const enrichedNode = { ...node };
  if (!enrichedNode.call_id && enrichedNode.id) {
    enrichedNode.call_id = enrichedNode.id;
  }

  let detailFields = DETAIL_KEYS.filter((key) => {
    if (key === "status") return shouldShowStatus;
    if (key === "deadline_model") return (node.deadline_model || "").trim().length > 0;
    if (["opening_date", "deadline", "funding_link"].includes(key)) {
      if (!shouldShowDatesAndLink) return false;
      const v = node[key];
      return v !== null && v !== undefined && v !== "";
    }
    return true;
  });

  const summaryPreview =
    typeof node.summary === "string" && node.summary.length > SUMMARY_PREVIEW_LIMIT
      ? `${node.summary.slice(0, SUMMARY_PREVIEW_LIMIT)}…`
      : node.summary;

  return (
    <Box className="mt-3 mb-5 p-2 border rounded shadow-sm hovered-node">
      <Typography variant="subtitle1" fontWeight="bold">
        Hovered Node
      </Typography>

      <Typography variant="body2">
        <strong>Label:</strong> {node.label || node.name}
      </Typography>
      <Typography variant="body2">
        <strong>Type:</strong> {node.type}
      </Typography>

      {summaryPreview && (
        <Typography variant="body2" sx={{ color: "white", mt: 1 }}>
          <strong>Summary:</strong>
          <br />
          {summaryPreview}
        </Typography>
      )}

      {detailFields.map((key) => (
        <Typography key={key} variant="body2">
          <strong>{formatLabel(key)}:</strong>{" "}
          {formatFieldValue(key, enrichedNode[key], enrichedNode)}
        </Typography>
      ))}
    </Box>
  );
};

export default HoveredNodeInfo;
