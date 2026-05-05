import React, { useEffect, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useHoverCardMeasure } from "./hooks/useHoverCardMeasure";
import { useHoverCardDrag } from "./hooks/useHoverCardDrag";
import { useHoverCardPosition } from "./hooks/useHoverCardPosition";
import { useHoveredNodeModel } from "./hooks/useHoveredNodeModel";

import HoverCardShell from "./ui/HoverCardShell";
import HoverCardHeader from "./ui/HoverCardHeader";
import MetricCards from "./ui/MetricCards";
import TagChips from "./ui/TagChips";
import ViewDetailsButton from "./ui/ViewDetailsButton";

import NODE_SUMMARIES from "../../utils/nodeSummaries.json";

const SUMMARY_PREVIEW_LIMIT = 240;
const PLACEHOLDER = "—";
const API_BASE = process.env.REACT_APP_API_URL || "";

// Limit hover-card tags so the footer/action area remains reachable.
const HOVER_TAG_LIMIT = 8;

// Simple in-memory cache for destination summaries (per page load)
const DEST_SUMMARY_CACHE = new Map();

function inferDatasetPrefix({ node, graphName }) {
  const id = String(node?.id || "");

  const m = id.match(/^CL([1-6]):/i);
  if (m) return `/cluster${m[1]}`;

  const g = String(graphName || "").replace(/_cose$/i, "");
  const m2 = g.match(/^Cluster_([1-6])$/i);
  if (m2) return `/cluster${m2[1]}`;

  const src = String(node?.source || "").toLowerCase();
  const srcMap = {
    cluster_1: "/cluster1",
    cluster_2: "/cluster2",
    cluster_3: "/cluster3",
    cluster_4: "/cluster4",
    cluster_5: "/cluster5",
    cluster_6: "/cluster6",
    dep: "/dep",
    erasmus: "/erasmus",
    cef: "/cef",
    crea: "/crea",
    euratom: "/euratom",
    eic: "/eic",
    eie: "/eie",
    erc: "/erc",
    msca: "/msca",
    infra: "/infra",
    missions: "/missions",
    widera: "/widera",
  };

  return srcMap[src] || "";
}

function cleanKey(k) {
  return String(k || "").replace(/_cose$/i, "");
}

function truncate(text, limit = SUMMARY_PREVIEW_LIMIT) {
  const s = String(text || "").trim();
  if (!s) return "";
  return s.length > limit ? `${s.slice(0, limit)}…` : s;
}

function nodeKindFrom(node) {
  const t = String(node?.type || node?.category || "").toLowerCase();
  return t;
}

function isCallNode(node) {
  return nodeKindFrom(node) === "call";
}

function isDestinationNode(node) {
  return nodeKindFrom(node) === "destination";
}

function resolveSummaryKey(node, graphName) {
  if (!node) return null;

  if (isDestinationNode(node) && node.id) return String(node.id);
  if (node.programmeKey) return cleanKey(node.programmeKey);

  if (node.id) {
    const id = cleanKey(node.id);
    if (/^PROG_/i.test(id)) return id.replace(/^PROG_/i, "");
    return id;
  }

  if (graphName) return cleanKey(graphName);

  return null;
}

function getSummaryEntry(node, graphName) {
  const rawKey = resolveSummaryKey(node, graphName);
  if (!rawKey) return null;

  const direct = NODE_SUMMARIES[rawKey] || NODE_SUMMARIES[cleanKey(rawKey)];
  if (direct) return { key: rawKey, ...direct };

  const aliases = NODE_SUMMARIES.__aliases__ || {};
  const aliasTarget =
    aliases[rawKey] ||
    aliases[cleanKey(rawKey)] ||
    aliases[String(rawKey).trim()] ||
    aliases[String(cleanKey(rawKey)).trim()];

  if (aliasTarget) {
    const canonical = NODE_SUMMARIES[aliasTarget] || NODE_SUMMARIES[cleanKey(aliasTarget)];
    if (canonical) return { key: aliasTarget, ...canonical };
  }

  return null;
}

export default function HoveredNodeInfo({
  node,
  cyInstance,
  onClose,
  graphName,
  isHoverFrozen = false,
  onOpenDetail,
}) {
  const navigate = useNavigate();

  const hoverPosition = useMemo(() => {
    const sp = node?.__screenPosition;
    if (!sp) return null;
    return { x: sp.x, y: sp.y };
  }, [node?.__screenPosition]);

  const model = useHoveredNodeModel({
    hoveredNode: node,
    cyInstance,
    graphName,
    isHoverFrozen,
  });

  const { cardRef, cardSize } = useHoverCardMeasure();
  const { dragPos, startDrag, resetDrag } = useHoverCardDrag({ cardRef });

  useEffect(() => {
    resetDrag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model?.id]);

  const [fetchedDestSummary, setFetchedDestSummary] = useState("");

  useEffect(() => {
    const isDest = String(node?.type || node?.category || "").toLowerCase() === "destination";
    const nodeId = String(node?.id || "");
    const raw = String(node?.summary || "").trim();

    if (!isDest || !nodeId) {
      setFetchedDestSummary("");
      return;
    }
    if (raw) {
      setFetchedDestSummary("");
      return;
    }

    if (DEST_SUMMARY_CACHE.has(nodeId)) {
      setFetchedDestSummary(DEST_SUMMARY_CACHE.get(nodeId) || "");
      return;
    }

    const prefix = inferDatasetPrefix({ node, graphName });
    if (!prefix) {
      setFetchedDestSummary("");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const url = `${API_BASE}${prefix}/node/${encodeURIComponent(nodeId)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed fetch ${res.status} for ${url}`);
        const data = await res.json();
        const s = String(data?.summary || "").trim();
        DEST_SUMMARY_CACHE.set(nodeId, s);
        if (!cancelled) setFetchedDestSummary(s);
      } catch (e) {
        DEST_SUMMARY_CACHE.set(nodeId, "");
        if (!cancelled) setFetchedDestSummary("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [node?.id, node?.type, node?.category, node?.summary, graphName]);

  const { positionStyle } = useHoverCardPosition({
    hoverPosition,
    dragPos,
    cardSize,
  });

  const summaryEntry = useMemo(() => getSummaryEntry(node, graphName), [node, graphName]);

  const resolvedSummary = useMemo(() => {
    const isDest = String(node?.type || node?.category || "").toLowerCase() === "destination";

    const s =
      (isDest ? String(fetchedDestSummary || "").trim() : "") ||
      String(node?.summary || "").trim() ||
      summaryEntry?.summary ||
      summaryEntry?.text ||
      String(node?.description || "").trim() ||
      "";

    return truncate(s, SUMMARY_PREVIEW_LIMIT) || PLACEHOLDER;
  }, [summaryEntry, node, fetchedDestSummary]);

  const shouldShowSummary = useMemo(() => {
    return !!node && !isCallNode(node);
  }, [node]);

  const visibleTags = useMemo(() => {
    const tags = Array.isArray(model?.tags) ? model.tags.filter(Boolean) : [];
    if (tags.length <= HOVER_TAG_LIMIT) return tags;
    const hiddenCount = tags.length - HOVER_TAG_LIMIT;
    return [...tags.slice(0, HOVER_TAG_LIMIT), `+${hiddenCount} more`];
  }, [model?.tags]);

function inferTypeOfActionAcronym(value) {
  const raw = String(value || "").trim();
  if (!raw) return PLACEHOLDER;

  const upper = raw.toUpperCase();

  // 1) Prefer explicit known acronyms if they already exist anywhere in the string
  const knownAcronyms = [
    "RIA",
    "IA",
    "CSA",
    "PCP",
    "PPI",
    "COFUND",
    "ERC",
    "MSCA",
    "EIC",
  ];

  for (const acronym of knownAcronyms) {
    const re = new RegExp(`\\b${acronym}\\b`, "i");
    if (re.test(upper)) return acronym;
  }

  // 2) Infer from common full action names
  const normalized = raw
    .replace(/^HORIZON[-\s]+/i, "")
    .replace(/^ERC[-\s]+/i, "")
    .replace(/^MSCA[-\s]+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (normalized.includes("research and innovation action")) return "RIA";
  if (normalized.includes("research and innovation actions")) return "RIA";

  if (
    normalized.includes("innovation action") &&
    !normalized.includes("research and innovation action")
  ) {
    return "IA";
  }
  if (
    normalized.includes("innovation actions") &&
    !normalized.includes("research and innovation actions")
  ) {
    return "IA";
  }

  if (normalized.includes("coordination and support action")) return "CSA";
  if (normalized.includes("coordination and support actions")) return "CSA";

  if (normalized.includes("programme cofund action")) return "COFUND";
  if (normalized.includes("programme cofund actions")) return "COFUND";

  if (normalized.includes("pre-commercial procurement")) return "PCP";
  if (normalized.includes("public procurement of innovative solutions")) return "PPI";

  if (normalized.includes("training and mobility action")) return "MSCA";
  if (normalized.includes("training and mobility actions")) return "MSCA";

  // 3) Handle patterns like "HORIZON-RIA ..."
  const prefixedMatch = upper.match(/\b(?:HORIZON|ERC|MSCA|EIC)-([A-Z]+)\b/);
  if (prefixedMatch?.[1]) return prefixedMatch[1];

  // 4) Final fallback: build acronym from capital letters / initials
  const fallback = raw
    .split(/[\s/()-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  return fallback || raw;
}

const filteredMetricCards = useMemo(() => {
  if (!Array.isArray(model?.metricCards)) return [];

  return model.metricCards
    .filter((m) => {
      const key = String(m?.key || "").toLowerCase();
      const val = String(m?.value || "").replace(/[^\d.]/g, "");

      const isContribution =
        key.includes("min_contribution") ||
        key.includes("max_contribution") ||
        m.label === "Min Contribution" ||
        m.label === "Max Contribution";

      if (!isContribution) return true;

      const num = Number(val);
      return Number.isFinite(num) && num !== 0;
    })
    .map((m) => {
      const label = String(m?.label || "").toLowerCase();
      console.log("Processing metric card:", { label, value: m?.value });
      if (label.includes("type of action")) {
        return {
          ...m,
          value: inferTypeOfActionAcronym(m?.value),
        };
      }

      return m;
    });
}, [model?.metricCards]);

  if (!model) return null;

  const handlePrimaryNavigate = () => {
    if (!model?.id) return;

    const shouldDrillIntoGraph =
      model.isClusterNode ||
      model.isDestinationNode ||
      model.isProgrammeNode ||
      model.isPillarNode ||
      model.isRootNode;

    if (shouldDrillIntoGraph) {
      try {
        const n = cyInstance?.$id?.(String(model.id));
        if (n && typeof n.empty === "function" && !n.empty()) {
          n.emit("tap");
          onClose?.();
          return;
        }
      } catch {
        // fall through
      }
    }

    // Only calls should open node detail from the hover card
    if (!model.isCallNode) {
      onClose?.();
      return;
    }

    const safeId = encodeURIComponent(String(model.id));

    const returnLayerKey =
      (cyInstance && !cyInstance?.destroyed?.()
        ? cyInstance?.scratch?.("layerKey")
        : null) || graphName || null;

    const returnGraphName =
      (cyInstance && !cyInstance?.destroyed?.()
        ? cyInstance?.scratch?.("graphName")
        : null) || graphName || null;

    const payload = {
      id: model.id,
      nodeData: node ?? null,
      returnLayerKey,
      returnGraphName,
    };

    if (typeof onOpenDetail === "function") {
      onOpenDetail(payload);
      onClose?.();
      return;
    }

    navigate(`/node/${safeId}`, {
      state: {
        nodeData: node ?? null,
        returnLayerKey,
        returnGraphName,
      },
    });
    onClose?.();
  };

  const summaryCardItems = shouldShowSummary
    ? [
        {
          key: "summary",
          label: "Summary",
          value: resolvedSummary,
          variant: "text",
          fullWidth: true,
        },
      ]
    : [];

  const tagsBlock =
    visibleTags?.length > 0 ? (
      <Box sx={{ mt: 1 }}>
        <Box
          sx={{
            maxHeight: 88,
            overflowY: "auto",
            pr: 0.5,
            overscrollBehavior: "contain",
          }}
        >
          <TagChips title="Related Topics" tags={visibleTags} />
        </Box>
      </Box>
    ) : null;

  const detailsButtonBlock = model.showViewDetails ? (
    <Box sx={{ mt: 1, position: "sticky", bottom: 0, background: "var(--surface, transparent)", zIndex: 1 }}>
      <ViewDetailsButton
        onClick={handlePrimaryNavigate}
        label={model.isCallNode ? "View Details" : "Enter Graph"}
      />
    </Box>
  ) : null;

  const card = (
    <HoverCardShell
      cardRef={cardRef}
      positionStyle={positionStyle}
      onPointerDown={startDrag}
      onClose={onClose}
      maxHeight="min(520px, calc(100vh - 24px))"
    >
      <HoverCardHeader
        title={summaryEntry?.title || model.title}
        titleFull={summaryEntry?.titleFull || summaryEntry?.title || model.titleFull}
        nodeVisual={model.nodeVisual}
        onTitleClick={handlePrimaryNavigate}
        onDotClick={handlePrimaryNavigate}
        chips={{
          typeLabel: model.typeLabel,
          showType: model.shouldShowHeaderChips,
          showPinned: model.isHoverFrozen,

          showCallCount:
            model.isDestinationNode &&
            typeof model.destinationCallCount === "number",
          callCount: model.destinationCallCount,

          showDestCount:
            model.isClusterNode &&
            typeof model.clusterDestinationCount === "number",
          destCount: model.clusterDestinationCount,
          destLabel: "Destinations",

          showNodeCount: false,
          nodeCount: null,
          nodeLabel: "Nodes",
        }}
      />

      {model.renderDestinationMinimal ? (
        <>
          {summaryCardItems.length > 0 && <MetricCards items={summaryCardItems} />}
          {tagsBlock}
          {detailsButtonBlock}
        </>
      ) : (
        <>
          {filteredMetricCards.length > 0 && (
            <MetricCards items={filteredMetricCards} />
          )}
          {summaryCardItems.length > 0 && <MetricCards items={summaryCardItems} />}
          {tagsBlock}
          {detailsButtonBlock}
        </>
      )}
    </HoverCardShell>
  );

  return typeof document !== "undefined" ? createPortal(card, document.body) : card;
}