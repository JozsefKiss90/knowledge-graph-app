// HoveredNodeInfo.js
import { Box, Chip, Typography, Divider, Button } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNavigate } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";

const SUMMARY_PREVIEW_LIMIT = 220;
const PLACEHOLDER = "—";

// --------- Generic helpers ---------
function truncate(text, limit = SUMMARY_PREVIEW_LIMIT) {
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function safeLabel(node) {
  return node.label || node.name || "Untitled node";
}

function safeType(node) {
  const t = node.type || node.category || "";
  return t ? t.replace(/_/g, " ") : "Node";
}

function safeId(node) {
  return node.call_id || node.id || "";
}

function extractConnections(node) {
  const candidates = [
    node.connections,
    node.degree,
    node.degree_centrality,
    node.num_connections,
  ];
  const value = candidates.find(
    (v) => typeof v === "number" && Number.isFinite(v)
  );
  return value != null ? value.toLocaleString() : "—";
}

function extractCentrality(node) {
  const candidates = [
    node.centrality,
    node.betweenness,
    node.closeness,
    node.eigenvector,
  ];
  const value = candidates.find(
    (v) => typeof v === "number" && Number.isFinite(v)
  );
  if (value == null) return "—";
  return value.toFixed(2);
}

function extractTags(node) {
  const candidates = node.related_topics || node.tags || node.themes;

  if (Array.isArray(candidates)) {
    return candidates.map((t) => String(t)).filter(Boolean).slice(0, 6);
  }

  if (typeof candidates === "string") {
    return candidates
      .split(/[;,]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  return [];
}

// --------- Call-specific helpers (from v_0, with fallbacks) ---------
const formatBaseValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString() : value;
  }
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
};

// First non-empty of a list of keys on node
function getFirstNonEmpty(node, keys) {
  if (!node) return undefined;
  for (const key of keys) {
    if (key in node) {
      const v = node[key];
      if (v !== null && v !== undefined && String(v).trim() !== "") {
        return v;
      }
    }
  }
  return undefined;
}

// Extract first number from text (for TRL or millions)
function parseNumber(text) {
  if (!text) return null;
  const match = String(text).match(/(\d+[.,]?\d*)/);
  if (!match) return null;
  const num = parseFloat(match[1].replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

const formatCallFieldValue = (key, rawValue, node) => {
  // Technology Readiness Level (TRL)
  if (key === "technology_readiness_level") {
    const v =
      rawValue ??
      getFirstNonEmpty(node, [
        "technology_readiness_level",
        "trl",
        "technology_readiness",
      ]);

    if (typeof v === "string" && v.trim().length > 0) {
      const trlMatch = v.match(/trl\s*(\d+)/i) || v.match(/(\d+)/);
      return trlMatch ? `TRL ${trlMatch[1]}` : PLACEHOLDER;
    }

    // if numeric (e.g. 6), format as TRL 6
    if (typeof v === "number" && Number.isFinite(v)) {
      return `TRL ${v}`;
    }

    return PLACEHOLDER;
  }

  // Append "million" for certain numeric fields
  if (["min_contribution", "max_contribution", "indicative_budget"].includes(key)) {
    let v = rawValue;
    if (key === "indicative_budget" && v == null) {
      v = getFirstNonEmpty(node, ["indicative_budget", "total_budget", "budget"]);
    }
    const num = parseNumber(v);
    return num != null ? `${num.toLocaleString()} million` : PLACEHOLDER;
  }

  // Derived "Indicative Number Of Projects" = indicative_budget / expected_eu_contribution
  if (key === "indicative_number_of_projects") {
    const total =
      parseNumber(node.indicative_budget) ??
      parseNumber(getFirstNonEmpty(node, ["total_budget", "budget"]));
    const eu =
      parseNumber(node.expected_eu_contribution) ??
      parseNumber(getFirstNonEmpty(node, ["expected_eu_contribution"]));

    if (total && eu && eu > 0) {
      const result = Math.round(total / eu);
      return result.toLocaleString();
    }
    return PLACEHOLDER;
  }

  // Deadline: allow any deadline-like key as fallback
  if (key === "deadline") {
    const v =
      rawValue ??
      getFirstNonEmpty(node, [
        "deadline",
        "deadline_1",
        "deadline_date",
        "deadline_single",
      ]);
    const base = formatBaseValue(v);
    return base === "" ? PLACEHOLDER : base;
  }

  // Type of action: try several possible keys
  if (key === "type_of_action") {
    const v =
      rawValue ??
      getFirstNonEmpty(node, ["type_of_action", "action_type", "call_type"]);
    const base = formatBaseValue(v);
    return base === "" ? PLACEHOLDER : base;
  }

  const base = formatBaseValue(rawValue);
  return base === "" ? PLACEHOLDER : base;
};

// --------- Component ---------
const HoveredNodeInfo = ({ node, onClose }) => {
  const navigate = useNavigate();

  if (!node) return null;

  // Enrich Call nodes with call_id fallback
  const isCallNode = node.type === "Call" || node.category === "Call";
  const enrichedNode = {
    ...node,
    call_id: node.call_id || node.id || node.callId,
  };

  const title = safeLabel(enrichedNode);
  const typeLabel = safeType(enrichedNode);
  const idLabel = safeId(enrichedNode);
  const summary = truncate(
    enrichedNode.summary || enrichedNode.description || ""
  );
  const connections = extractConnections(enrichedNode);
  const centrality = extractCentrality(enrichedNode);
  const tags = extractTags(enrichedNode);

  const isClusterLike =
    enrichedNode.type === "cluster" ||
    enrichedNode.type === "Cluster" ||
    enrichedNode.category === "Cluster";

  const accentColor = isClusterLike ? "#f9b347" : "#4a9eff";

  const handleTitleClick = () => {
    if (!enrichedNode.id) return;
    navigate(`/node/${encodeURIComponent(enrichedNode.id)}`, {
      state: { nodeData: { ...enrichedNode } },
    });
  };

  const screenPos = enrichedNode.__screenPosition;

  let positionStyle;
  if (screenPos && typeof window !== "undefined") {
    const vw = window.innerWidth || 0;
    const vh = window.innerHeight || 0;

    const CARD_WIDTH_EST = 340; // estimated card width
    const PADDING = 16;
    const H_GAP = 40;           // horizontal gap from the node
    const V_GAP = 24;           // vertical gap from the node

    // Decide side (left/right) and vertical orientation (above/below)
    const placeRight = screenPos.x < vw * 0.5;  // node on left side → card on right
    const placeAbove = screenPos.y > vh * 0.7;  // only above when very low

    let left = placeRight
      ? screenPos.x + H_GAP
      : screenPos.x - H_GAP;

    let top = placeAbove
      ? screenPos.y - V_GAP
      : screenPos.y + V_GAP;

    // Clamp horizontally to viewport
    if (placeRight) {
      // card extends to the right of 'left'
      const maxLeft = vw - PADDING;
      left = Math.min(left, maxLeft);
    } else {
      // card extends to the left of 'left'
      const minLeft = PADDING + CARD_WIDTH_EST;
      left = Math.max(left, minLeft);
    }

    // Clamp vertically to viewport
    const minTop = PADDING;
    const maxTop = vh - PADDING;
    top = Math.max(minTop, Math.min(maxTop, top));

    positionStyle = {
      position: "fixed",
      left,
      top,
      transform: `translate(${placeRight ? "0" : "-100%"}, ${
        placeAbove ? "-100%" : "0"
      })`,
      zIndex: 1300,
      pointerEvents: "auto",
    };
  } else {
    // Fallback: centered near the top
    positionStyle = {
      position: "fixed",
      left: "50%",
      top: 80,
      transform: "translateX(-50%)",
      zIndex: 1300,
      pointerEvents: "auto",
    };
  }

  // Metrics row: specialised for Call nodes
  let metricCards;
  if (isCallNode) {
    const trl = formatCallFieldValue(
      "technology_readiness_level",
      enrichedNode.technology_readiness_level,
      enrichedNode
    );
    const budget = formatCallFieldValue(
      "indicative_budget",
      enrichedNode.indicative_budget,
      enrichedNode
    );
    const deadline = formatCallFieldValue(
      "deadline",
      enrichedNode.deadline,
      enrichedNode
    );
    const actionType = formatCallFieldValue(
      "type_of_action",
      enrichedNode.type_of_action,
      enrichedNode
    );

    metricCards = [
      { label: "TRL", value: trl },
      { label: "Indicative Budget", value: budget },
      { label: "Deadline", value: deadline },
      { label: "Type of Action", value: actionType },
    ];
  } else {
    metricCards = [
      { label: "Connections", value: connections },
      { label: "Centrality", value: centrality },
    ];
  }

  return (
    <Box
      className="hovered-node-card hovered-node-card--visible"
      sx={{
        ...positionStyle,
        borderRadius: 3,
        boxShadow: 6,
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        minWidth: 260,
        maxWidth: 360,
        p: 1.5,
        opacity: 0,
        animation: "euHoverCardIn 160ms ease-out forwards",
        pointerEvents: "auto",
      }}
    >
      {/* Close button */}
      <IconButton
        size="small"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose?.();
        }}
        sx={{
          position: "absolute",
          top: 6,
          right: 6,
          color: "var(--foreground-muted)",
          "&:hover": { color: "var(--foreground)" }
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          mb: 1.5,
        }}
      >
        {/* Icon bubble */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: accentColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ color: "#fff", fontWeight: 700 }}
          >
            {title.charAt(0).toUpperCase()}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              cursor: enrichedNode.id ? "pointer" : "default",
              "&:hover": enrichedNode.id
                ? { color: "var(--primary)", textDecoration: "underline" }
                : {},
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
            }}
            onClick={handleTitleClick}
            title={title}
          >
            {title}
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
              mt: 0.5,
            }}
          >
            <Chip
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
            {idLabel && (
              <Typography
                variant="caption"
                sx={{ opacity: 0.85 }}
              >{`Call ID: ${idLabel}`}</Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Summary */}
      {summary && (
        <Typography
          variant="body2"
          sx={{ mb: 1.5, lineHeight: 1.4, color: "var(--muted-foreground)" }}
        >
          {summary}
        </Typography>
      )}

      {/* Metrics row */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          mb: tags.length ? 1.5 : 0.5,
          flexWrap: "wrap",
        }}
      >
        {metricCards.map((card) => (
          <Box
            key={card.label}
            sx={{
              flex: 1,
              minWidth: 120,
              p: 1,
              borderRadius: 2,
              backgroundColor: "var(--muted)",
            }}
          >
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              {card.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {card.value || PLACEHOLDER}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Related tags */}
      {tags.length > 0 && (
        <>
          <Typography
            variant="caption"
            sx={{ opacity: 0.7, display: "block", mb: 0.5 }}
          >
            Related Topics
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                sx={{
                  fontSize: "0.7rem",
                  borderRadius: "999px",
                  backgroundColor: "rgba(0,0,0,0.05)",
                  color: "var(--foreground)",
                }}
              />
            ))}
          </Box>
        </>
      )}
       {/* View details CTA */}
      {enrichedNode.id && (
        <Box sx={{ mt: 1.5 }}>
          <Button
            fullWidth
            size="small"
            variant="contained"
            startIcon={<OpenInNewIcon fontSize="small" />}
            onClick={handleTitleClick}
            sx={{
              mt: 0.5,
              borderRadius: 999,
              textTransform: "none",
              fontWeight: 600,
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              "&:hover": {
                backgroundColor: "var(--primary-dark)",
              },
            }}
          >
            View Details
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default HoveredNodeInfo;
