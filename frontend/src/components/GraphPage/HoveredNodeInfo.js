// HoveredNodeInfo.js
import { Box, Chip, Typography, Divider, Button, IconButton } from "@mui/material";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

const SUMMARY_PREVIEW_LIMIT = 220;
const PLACEHOLDER = "—";

// Positioning safety insets (tuned for your UI)
const PADDING = 12;
const EXTRA_TOP_INSET = 300;
const EXTRA_LEFT_INSET = 140;

// --------- Generic helpers ---------
function truncate(text, limit = SUMMARY_PREVIEW_LIMIT) {
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function safeLabel(node) {
  return node?.label || node?.name || "Untitled node";
}

function safeType(node) {
  const t = node?.type || node?.category || "";
  return t ? String(t).replace(/_/g, " ") : "Node";
}

function safeId(node) {
  return node?.call_id || node?.id || "";
}

function extractConnections(node) {
  const candidates = [
    node?.connections,
    node?.degree,
    node?.degree_centrality,
    node?.num_connections,
  ];
  const value = candidates.find((v) => typeof v === "number" && Number.isFinite(v));
  return value != null ? value.toLocaleString() : PLACEHOLDER;
}

function extractCentrality(node) {
  const candidates = [node?.centrality, node?.betweenness, node?.closeness, node?.eigenvector];
  const value = candidates.find((v) => typeof v === "number" && Number.isFinite(v));
  if (value == null) return PLACEHOLDER;
  return value.toFixed(2);
}

function extractTags(node) {
  const candidates = node?.related_topics || node?.tags || node?.themes;

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

// --------- Call-specific helpers ---------
const formatBaseValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : String(value);
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
};

function getFirstNonEmpty(node, keys) {
  if (!node) return undefined;
  for (const key of keys) {
    if (key in node) {
      const v = node[key];
      if (v !== null && v !== undefined && String(v).trim() !== "") return v;
    }
  }
  return undefined;
}

function parseNumber(text) {
  if (!text) return null;
  const match = String(text).match(/(\d+[.,]?\d*)/);
  if (!match) return null;
  const num = parseFloat(match[1].replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

const formatCallFieldValue = (key, rawValue, node) => {
  if (key === "technology_readiness_level") {
    const v =
      rawValue ??
      getFirstNonEmpty(node, ["technology_readiness_level", "trl", "technology_readiness"]);

    if (typeof v === "string" && v.trim().length > 0) {
      const trlMatch = v.match(/trl\s*(\d+)/i) || v.match(/(\d+)/);
      return trlMatch ? `TRL ${trlMatch[1]}` : PLACEHOLDER;
    }
    if (typeof v === "number" && Number.isFinite(v)) return `TRL ${v}`;
    return PLACEHOLDER;
  }

  if (["min_contribution", "max_contribution", "indicative_budget"].includes(key)) {
    let v = rawValue;
    if (key === "indicative_budget" && v == null) {
      v = getFirstNonEmpty(node, ["indicative_budget", "total_budget", "budget"]);
    }
    const num = parseNumber(v);
    return num != null ? `${num.toLocaleString()} million` : PLACEHOLDER;
  }

  if (key === "indicative_number_of_projects") {
    const total =
      parseNumber(node?.indicative_budget) ??
      parseNumber(getFirstNonEmpty(node, ["total_budget", "budget"]));
    const eu =
      parseNumber(node?.expected_eu_contribution) ??
      parseNumber(getFirstNonEmpty(node, ["expected_eu_contribution"]));
    if (total && eu && eu > 0) return Math.round(total / eu).toLocaleString();
    return PLACEHOLDER;
  }

  if (key === "deadline") {
    const v = rawValue ?? getFirstNonEmpty(node, ["deadline", "deadline_1", "deadline_date", "deadline_single"]);
    const base = formatBaseValue(v);
    return base === "" ? PLACEHOLDER : base;
  }

  if (key === "type_of_action") {
    const v = rawValue ?? getFirstNonEmpty(node, ["type_of_action", "action_type", "call_type"]);
    const base = formatBaseValue(v);
    return base === "" ? PLACEHOLDER : base;
  }

  const base = formatBaseValue(rawValue);
  return base === "" ? PLACEHOLDER : base;
};

// --------- Component ---------
const HoveredNodeInfo = ({ node, cyInstance, onClose }) => {
  // Hooks MUST be called unconditionally on every render
  const navigate = useNavigate();

  const cardRef = useRef(null);
  const [cardSize, setCardSize] = useState({ w: 340, h: 260 });

  // Drag state: if set, overrides automatic placement.
  const [dragPos, setDragPos] = useState(null); // { left, top } | null
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 });

  // Listener indirection for stable add/remove
  const moveImplRef = useRef(null);
  const upImplRef = useRef(null);
  const pointerMoveListenerRef = useRef(null);
  const pointerUpListenerRef = useRef(null);

  if (!pointerMoveListenerRef.current) {
    pointerMoveListenerRef.current = (e) => moveImplRef.current?.(e);
  }
  if (!pointerUpListenerRef.current) {
    pointerUpListenerRef.current = () => upImplRef.current?.();
  }

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const enrichedNode = useMemo(() => {
    if (!node) return null;
    return { ...node, call_id: node.call_id || node.id || node.callId };
  }, [node]);

  const nodeKind = useMemo(() => {
    const t = (enrichedNode?.type || enrichedNode?.category || "").toString().toLowerCase();
    return t;
  }, [enrichedNode?.type, enrichedNode?.category]);

  const isCallNode = !!enrichedNode && nodeKind === "call";
  const isDestinationNode = !!enrichedNode && nodeKind === "destination";
  const isClusterNode = !!enrichedNode && (nodeKind === "cluster" || nodeKind === "root"); // keep “root-as-cluster” safe

  const nodeVisual = useMemo(() => {
    const fallback = {
      fill: enrichedNode?.color || enrichedNode?.fill || enrichedNode?.backgroundColor || enrichedNode?.bg || "#4a9eff",
      borderColor: "#ffffff",
      borderWidthPx: 2,
    };

    if (!enrichedNode?.id || !cyInstance || cyInstance.destroyed?.()) return fallback;

    try {
      const n = cyInstance.$id(String(enrichedNode.id));
      if (!n || n.empty?.()) return fallback;

      const fill = n.style("background-color") || fallback.fill;
      const borderColor = "#ffffff";
      const borderWidthPx = 2;

      return { fill, borderColor, borderWidthPx };
    } catch {
      return fallback;
    }
  }, [enrichedNode?.id, enrichedNode?.color, enrichedNode?.fill, enrichedNode?.backgroundColor, enrichedNode?.bg, cyInstance]);

  useLayoutEffect(() => {
    if (!enrichedNode) return;
    if (!cardRef.current) return;

    const el = cardRef.current;

    const measure = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      setCardSize((prev) => {
        if (Math.abs(prev.w - r.width) < 1 && Math.abs(prev.h - r.height) < 1) return prev;
        return { w: r.width, h: r.height };
      });
    };

    measure();

    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }

    return () => {
      try {
        ro?.disconnect();
      } catch {}
    };
  }, [enrichedNode?.id, isCallNode, isDestinationNode, isClusterNode]);

  useEffect(() => {
    setDragPos(null);
    dragRef.current.active = false;

    try {
      window.removeEventListener("pointermove", pointerMoveListenerRef.current);
      window.removeEventListener("pointerup", pointerUpListenerRef.current);
    } catch {}
  }, [enrichedNode?.id]);

  useEffect(() => {
    return () => {
      try {
        window.removeEventListener("pointermove", pointerMoveListenerRef.current);
        window.removeEventListener("pointerup", pointerUpListenerRef.current);
      } catch {}
    };
  }, []);

  // If no node, render nothing (AFTER hooks)
  if (!enrichedNode) return null;

  const title = safeLabel(enrichedNode);
  const typeLabel = safeType(enrichedNode);

  // Destination: ONLY show title (no chips, summary, metric cards, tags, buttons)
  const renderDestinationMinimal = isDestinationNode;

  // Cluster summary (single box). We’ll accept several candidate keys now; you’ll finalize JSON later.
  const clusterSummaryRaw = getFirstNonEmpty(enrichedNode, [
    "cluster_summary",
    "clusterSummary",
    "summary_short",
    "short_summary",
    "summary",
    "description",
  ]);
  const clusterSummary = truncate(String(clusterSummaryRaw || ""), SUMMARY_PREVIEW_LIMIT) || PLACEHOLDER;

  const summaryDefault = truncate(enrichedNode.summary || enrichedNode.description || "");

  const connections = extractConnections(enrichedNode);
  const centrality = extractCentrality(enrichedNode);
  const tags = extractTags(enrichedNode);

  const handleGraphNavigate = () => {
    if (!enrichedNode?.id) return;

    try {
      if (cyInstance && !cyInstance.destroyed?.()) {
        const n = cyInstance.$id(String(enrichedNode.id));
        if (n && n.nonempty?.()) {
          n.emit("tap");
          return;
        }
      }
    } catch {}

    navigate(`/node/${encodeURIComponent(enrichedNode.id)}`, {
      state: { nodeData: { ...enrichedNode } },
    });
  };

  const handleDetailNavigate = () => {
    if (!enrichedNode?.id) return;
    navigate(`/node/${encodeURIComponent(enrichedNode.id)}`, {
      state: { nodeData: { ...enrichedNode } },
    });
  };

  const screenPos = enrichedNode.__screenPosition;
  const renderedSize = enrichedNode.__renderedSize;

  // ---- Positioning (auto + drag override) ----
  let positionStyle;
  let baseLeft = 0;
  let baseTop = 0;

  if (screenPos && typeof window !== "undefined") {
    const CARD_W = cardSize.w;
    const CARD_H = cardSize.h;

    const nodeRadius =
      renderedSize && renderedSize.w && renderedSize.h
        ? Math.max(renderedSize.w, renderedSize.h) / 2
        : 20;

    const EXCLUSION = nodeRadius + 12;

    const MIN_OFFSET = 30;
    const MAX_OFFSET = 90;
    const BASE_GAP = 12;
    const offset = Math.max(
      clamp(nodeRadius + BASE_GAP, MIN_OFFSET, MAX_OFFSET),
      EXCLUSION + 8
    );

    const viewport = {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };

    const availableH = Math.max(200, viewport.bottom - viewport.top - PADDING * 2);
    const EFFECTIVE_H = Math.min(CARD_H, availableH);

    const bounds = {
      minX: viewport.left + PADDING + EXTRA_LEFT_INSET,
      maxX: viewport.right - CARD_W - PADDING,
      minY: viewport.top + PADDING + EXTRA_TOP_INSET,
      maxY: viewport.bottom - EFFECTIVE_H - PADDING,
    };

    bounds.maxX = Math.max(bounds.maxX, bounds.minX);
    bounds.maxY = Math.max(bounds.maxY, bounds.minY);

    const clampCandidate = (c) => ({
      left: clamp(c.left, bounds.minX, bounds.maxX),
      top: clamp(c.top, bounds.minY, bounds.maxY),
    });

    const rawRight = { left: screenPos.x + offset, top: screenPos.y - CARD_H / 2 };
    const rawLeft = { left: screenPos.x - offset - CARD_W, top: screenPos.y - CARD_H / 2 };

    const right = clampCandidate(rawRight);
    const left = clampCandidate(rawLeft);

    const exRect = {
      left: screenPos.x - EXCLUSION,
      right: screenPos.x + EXCLUSION,
      top: screenPos.y - EXCLUSION,
      bottom: screenPos.y + EXCLUSION,
    };

    const overlapArea = (c) => {
      const r = { left: c.left, right: c.left + CARD_W, top: c.top, bottom: c.top + CARD_H };
      const w = Math.max(0, Math.min(r.right, exRect.right) - Math.max(r.left, exRect.left));
      const h = Math.max(0, Math.min(r.bottom, exRect.bottom) - Math.max(r.top, exRect.top));
      return w * h;
    };

    const clampShift = (raw, clamped) =>
      Math.abs(raw.left - clamped.left) + Math.abs(raw.top - clamped.top);

    const score = (raw, c) => overlapArea(c) * 1000 + clampShift(raw, c);

    let best = score(rawRight, right) <= score(rawLeft, left) ? right : left;

    if (overlapArea(best) > 0) {
      const PAD = 8;
      const above = clampCandidate({ left: best.left, top: exRect.top - CARD_H - PAD });
      const below = clampCandidate({ left: best.left, top: exRect.bottom + PAD });

      const delta = (c) => Math.abs(c.top - best.top);
      const pick = (a, b) => {
        const oa = overlapArea(a);
        const ob = overlapArea(b);
        if (oa !== ob) return oa < ob ? a : b;
        return delta(a) <= delta(b) ? a : b;
      };

      const shifted = pick(above, below);
      if (overlapArea(shifted) < overlapArea(best)) best = shifted;
    }

    baseLeft = best.left;
    baseTop = best.top;

    const finalLeft = dragPos?.left ?? baseLeft;
    const finalTop = dragPos?.top ?? baseTop;

    positionStyle = {
      position: "fixed",
      left: finalLeft,
      top: finalTop,
      zIndex: 1300,
      pointerEvents: "auto",
      willChange: "left, top",
    };
  } else {
    positionStyle = {
      position: "fixed",
      left: "50%",
      top: 80,
      transform: "translateX(-50%)",
      zIndex: 1300,
      pointerEvents: "auto",
    };
  }

  // ---- Drag listeners (stable) ----
  moveImplRef.current = (e) => {
    if (!dragRef.current.active) return;
    e.preventDefault();

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    const CARD_W = cardSize.w;
    const CARD_H = cardSize.h;

    const minX = PADDING + EXTRA_LEFT_INSET;
    const maxX = window.innerWidth - CARD_W - PADDING;
    const minY = PADDING + EXTRA_TOP_INSET;
    const maxY = window.innerHeight - CARD_H - PADDING;

    const nextLeft = clamp(dragRef.current.startLeft + dx, minX, Math.max(minX, maxX));
    const nextTop = clamp(dragRef.current.startTop + dy, minY, Math.max(minY, maxY));

    setDragPos({ left: nextLeft, top: nextTop });
  };

  upImplRef.current = () => {
    dragRef.current.active = false;
    try {
      window.removeEventListener("pointermove", pointerMoveListenerRef.current);
      window.removeEventListener("pointerup", pointerUpListenerRef.current);
    } catch {}
  };

  const startDrag = (e) => {
    if (typeof window === "undefined") return;
    if (e.target?.closest?.("[data-no-drag='true']")) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {}

    const currentLeft =
      typeof positionStyle.left === "number" ? positionStyle.left : (dragPos?.left ?? baseLeft);
    const currentTop =
      typeof positionStyle.top === "number" ? positionStyle.top : (dragPos?.top ?? baseTop);

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: currentLeft,
      startTop: currentTop,
    };

    window.addEventListener("pointermove", pointerMoveListenerRef.current, { passive: false });
    window.addEventListener("pointerup", pointerUpListenerRef.current, { passive: true });
  };

  // --- Metric cards rules ---
  // - Destination: none (title only)
  // - Cluster: single Summary box
  // - Call: existing call metric cards
  // - Other: keep Connections/Centrality (unchanged)
  let metricCards = [];

  if (!renderDestinationMinimal) {
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
      const deadline = formatCallFieldValue("deadline", enrichedNode.deadline, enrichedNode);
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
    } else if (isClusterNode) {
      metricCards = [{ label: "Summary", value: clusterSummary }];
    } else {
      metricCards = [
        { label: "Connections", value: connections },
        { label: "Centrality", value: centrality },
      ];
    }
  }

  // View Details button:
  // - Required: Cluster shows it
  // - Keep: Call shows it
  // - Destination: hide (title-only requirement)
  const showViewDetails = !!enrichedNode.id && !renderDestinationMinimal && (isClusterNode || isCallNode);

  // Summary text block:
  // - Destination: none
  // - Cluster: we use the single Summary metric box only (no extra summary paragraph)
  // - Others: keep old summary paragraph if present
  const shouldRenderSummaryParagraph =
    !renderDestinationMinimal && !isClusterNode && !!summaryDefault;

  const maxCardHeight =
    typeof window !== "undefined"
      ? Math.max(220, Math.floor(window.innerHeight - (EXTRA_TOP_INSET + 24)))
      : undefined;

  const card = (
    <Box
      ref={cardRef}
      className="hovered-node-card hovered-node-card--visible"
      onPointerDown={startDrag}
      sx={{
        ...positionStyle,
        borderRadius: 3,
        boxShadow: 6,
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        minWidth: 260,
        maxWidth: 360,
        maxHeight: maxCardHeight,
        overflowY: maxCardHeight ? "auto" : "visible",
        p: 1.5,
        opacity: 0,
        animation: "euHoverCardIn 160ms ease-out forwards",
        pointerEvents: "auto",
        cursor: "grab",
        userSelect: "none",
        touchAction: "none",
        "&:active": { cursor: "grabbing" },
      }}
    >
      <IconButton
        data-no-drag="true"
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
          "&:hover": { color: "var(--foreground)" },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          mb: renderDestinationMinimal ? 0 : 1.5,
          cursor: "grab",
          userSelect: "none",
          "&:active": { cursor: "grabbing" },
          touchAction: "none",
        }}
      >
        {/* Keep the avatar dot even for Destination; it does not add “boxes” and helps orientation */}
        <Box
          data-no-drag="true"
          onClick={(e) => {
            if (renderDestinationMinimal) return;
            e.preventDefault();
            e.stopPropagation();
            handleGraphNavigate();
          }}
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: nodeVisual.fill,
            border: `${nodeVisual.borderWidthPx}px solid ${nodeVisual.borderColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: !renderDestinationMinimal && enrichedNode.id ? "pointer" : "default",
          }}
          title={!renderDestinationMinimal && enrichedNode.id ? "Open" : undefined}
        >
          <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 700 }}>
            {title.charAt(0).toUpperCase()}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
         <Typography
  data-no-drag="true"
  variant="subtitle1"
  sx={{
    fontWeight: 700,

    // IMPORTANT: ensure full title is visible (no ellipsis / no line clamp)
    whiteSpace: "normal !important",
    overflow: "visible !important",
    textOverflow: "clip !important",
    display: "block !important",
    wordBreak: "break-word",
    overflowWrap: "anywhere",

    // prevent the close icon from visually “cutting” the last characters
    paddingRight: "32px",

    cursor: !renderDestinationMinimal && enrichedNode.id ? "pointer" : "default",
    "&:hover":
      !renderDestinationMinimal && enrichedNode.id
        ? { color: "var(--primary)", textDecoration: "underline" }
        : {},
    lineHeight: 1.2,
  }}
  onClick={(e) => {
    if (renderDestinationMinimal) return;
    e.preventDefault();
    e.stopPropagation();
    handleGraphNavigate();
  }}
  title={title}
>
  {title}
</Typography>


          {/* Destination: title only (no chips) */}
          {!renderDestinationMinimal && (
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
              <Chip
                data-no-drag="true"
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
            </Box>
          )}
        </Box>
      </Box>

      {/* Destination: stop here (title only) */}
      {renderDestinationMinimal ? null : (
        <>
          <Divider sx={{ my: 1 }} />

          {shouldRenderSummaryParagraph && (
            <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.4, color: "var(--muted-foreground)" }}>
              {summaryDefault}
            </Typography>
          )}

          {/* Metric cards */}
          {metricCards.length > 0 && (
            <Box sx={{ display: "flex", gap: 1, mb: tags.length ? 1.5 : 0.5, flexWrap: "wrap" }}>
              {metricCards.map((m) => (
                <Box
                  key={m.label}
                  sx={{ flex: 1, minWidth: 120, p: 1, borderRadius: 2, backgroundColor: "var(--muted)" }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    {m.label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {m.value || PLACEHOLDER}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Tags: leave as-is for Calls/others; Cluster can also show tags if present */}
          {tags.length > 0 && (
            <>
              <Typography variant="caption" sx={{ opacity: 0.7, display: "block", mb: 0.5 }}>
                Related Topics
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {tags.map((tag) => (
                  <Chip
                    data-no-drag="true"
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

          {/* View Details: REQUIRED for Cluster, kept for Call, hidden for Destination */}
          {showViewDetails && (
            <Box sx={{ mt: 1.5 }}>
              <Button
                data-no-drag="true"
                fullWidth
                size="small"
                variant="contained"
                startIcon={<OpenInNewIcon fontSize="small" />}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDetailNavigate();
                }}
                sx={{
                  mt: 0.5,
                  borderRadius: 999,
                  textTransform: "none",
                  fontWeight: 600,
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                  "&:hover": { backgroundColor: "var(--primary-dark)" },
                }}
              >
                View Details
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );

  return typeof document !== "undefined" ? createPortal(card, document.body) : card;
};

export default HoveredNodeInfo;
