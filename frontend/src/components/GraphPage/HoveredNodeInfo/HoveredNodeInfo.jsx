import React, { useEffect, useMemo, useState } from "react";
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

// Simple in-memory cache for destination summaries (per page load)
const DEST_SUMMARY_CACHE = new Map();

function inferDatasetPrefix({ node, graphName }) {
  const id = String(node?.id || "");

  // Prefer parsing destination id prefix (CL1..CL6)
  const m = id.match(/^CL([1-6]):/i);
  if (m) return `/cluster${m[1]}`;

  // Fall back to dataset key
  const g = String(graphName || "").replace(/_cose$/i, "");
  const m2 = g.match(/^Cluster_([1-6])$/i);
  if (m2) return `/cluster${m2[1]}`;

  // Fall back to node.source (if present)
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

  // Destinations: stable key = destination id
  if (isDestinationNode(node) && node.id) return String(node.id);
  // Programme nodes: prefer programmeKey
  if (node.programmeKey) return cleanKey(node.programmeKey);

  // Synthetic ids: PROG_DEP -> DEP
  if (node.id) {
    const id = cleanKey(node.id);
    if (/^PROG_/i.test(id)) return id.replace(/^PROG_/i, "");
    return id;
  }

  // fallback: graphName
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

  // ✅ Hooks must be unconditional: compute these before any early returns
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

// Lazy-fetch destination summary if missing in bulk graph payload
useEffect(() => {
  const isDest = String(node?.type || node?.category || "").toLowerCase() === "destination";
  const nodeId = String(node?.id || "");
  const raw = String(node?.summary || "").trim();

  // If not destination, or already has summary, clear fetched
  if (!isDest || !nodeId) {
    setFetchedDestSummary("");
    return;
  }
  if (raw) {
    setFetchedDestSummary("");
    return;
  }

  // Cache hit
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
      // optional: console.debug(e);
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

  // ✅ compute summary-related memoized values unconditionally too
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

  // NOW safe to early-return
  if (!model) return null;

  const handlePrimaryNavigate = () => {
    if (!model?.id) return;

    // Cluster + Destination: drill further into the graph
    if (model.isClusterNode || model.isDestinationNode) {
      try {
        const n = cyInstance?.$id?.(String(model.id));
        if (n && n.nonempty && n.nonempty()) {
          n.emit("tap");
          onClose?.();
          return;
        }
      } catch {
        // fall through
      }
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
          {/* ✅ Summary still shown for minimal destination cards */}
          {summaryCardItems.length > 0 && <MetricCards items={summaryCardItems} />}

          {model.tags?.length > 0 && (
            <TagChips title="Related Topics" tags={model.tags} />
          )}
          {model.showViewDetails && (
            <ViewDetailsButton onClick={handlePrimaryNavigate} />
          )}
        </>
      ) : (
        <>
          {model.metricCards?.length > 0 && (
            <MetricCards items={model.metricCards} />
          )}

          {/* ✅ universal summary for all non-call nodes */}
          {summaryCardItems.length > 0 && <MetricCards items={summaryCardItems} />}

          {model.tags?.length > 0 && (
            <TagChips title="Related Topics" tags={model.tags} />
          )}
          {model.showViewDetails && (
            <ViewDetailsButton onClick={handlePrimaryNavigate} />
          )}
        </>
      )}
    </HoverCardShell>
  );

  return typeof document !== "undefined" ? createPortal(card, document.body) : card;
}
