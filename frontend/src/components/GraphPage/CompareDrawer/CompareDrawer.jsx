import React from "react";
import { createPortal } from "react-dom";
import { Box, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";

import CompareNodeHeader from "./CompareNodeHeader";
import CompareMetricRow from "./CompareMetricRow";
import CompareTopicOverlap from "./CompareTopicOverlap";
import CompareCallBody from "./CompareCallBody";
import { useCompareData } from "./useCompareData";
import { useCallCompareData, isCallNode } from "./useCallCompareData";

function formatBudget(value) {
  if (!value || !Number.isFinite(value) || value === 0) return "N/A";
  if (value >= 1e9) return `€${(value / 1e9).toFixed(1)} B`;
  if (value >= 1e6) return `€${(value / 1e6).toFixed(1)} M`;
  if (value >= 1e3) return `€${(value / 1e3).toFixed(1)} K`;
  return `€${value.toLocaleString()}`;
}

function formatNumber(value) {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return value.toLocaleString();
}

export default function CompareDrawer({
  open,
  nodes = [],
  loadFromStore,
  onClose,
  onClearNode,
}) {
  const nodeA = nodes[0] || null;
  const nodeB = nodes[1] || null;

  // Both metric hooks run unconditionally (rules of hooks); the render below picks whichever
  // matches the selection's kind. Structure compare is untouched; call-level compare (phase-plan
  // Step 6) is the added branch. useCallCompareData's two evidence fetches stay idle for a
  // structure selection (null ids), so nothing extra runs when comparing programmes.
  const { metricsA, metricsB, sharedTopics, topOverlap } = useCompareData(
    nodeA,
    nodeB,
    loadFromStore
  );
  const { callA, callB } = useCallCompareData(nodeA, nodeB);

  if (!open) return null;

  const kindA = nodeA ? (isCallNode(nodeA) ? "call" : "structure") : null;
  const kindB = nodeB ? (isCallNode(nodeB) ? "call" : "structure") : null;
  // The first selected node sets the comparison kind; a second node of the other kind is a mismatch.
  const compareKind = kindA || kindB || "structure";
  const isCall = compareKind === "call";
  const mixed = kindA && kindB && kindA !== kindB;
  const hasBothNodes = nodeA && nodeB;

  const noun = isCall ? "call" : "programme";
  const title = isCall ? "Compare calls" : "Compare programmes";
  const emptyHint =
    nodes.length === 0
      ? `Click two ${noun}s on the graph to compare them`
      : `Click one more ${noun} to start comparing`;

  // Kind-aware header subtitle: calls show status, structure nodes keep the "2021-27" default.
  const subtitleFor = (kind, metrics) => (kind === "call" ? metrics?.status || "" : undefined);

  const card = (
    <Box className="compare-drawer">
      {/* Header */}
      <Box className="compare-drawer__header">
        <CompareArrowsIcon sx={{ fontSize: 20, color: "var(--primary)" }} />
        <Typography sx={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{title}</Typography>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: "var(--foreground-muted)",
            "&:hover": { color: "var(--foreground)" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {!hasBothNodes ? (
        /* Placeholder: waiting for node selection */
        <Box sx={{ py: 3, textAlign: "center" }}>
          <Typography sx={{ fontSize: 13, color: "var(--foreground-muted)", mb: 1 }}>
            {emptyHint}
          </Typography>

          {/* Show first selected node if any */}
          {nodeA && (
            <Box sx={{ mt: 2, textAlign: "left" }}>
              <CompareNodeHeader
                node={nodeA}
                onClear={() => onClearNode?.(0)}
                subtitle={subtitleFor(kindA, callA.metrics)}
              />
            </Box>
          )}
        </Box>
      ) : mixed ? (
        /* Guard: compare works like-with-like. Show both headers so the user can clear one. */
        <>
          <Box className="compare-drawer__columns">
            <CompareNodeHeader
              node={nodeA}
              onClear={() => onClearNode?.(0)}
              subtitle={subtitleFor(kindA, callA.metrics)}
            />
            <CompareNodeHeader
              node={nodeB}
              onClear={() => onClearNode?.(1)}
              subtitle={subtitleFor(kindB, callB.metrics)}
            />
          </Box>
          <Typography sx={{ fontSize: 13, color: "var(--foreground-muted)", mt: 1 }}>
            Compare works on two of the same kind — pick two calls, or two programmes. Clear one to
            switch.
          </Typography>
        </>
      ) : isCall ? (
        /* Call-level compare (Step 6): deadline/budget + A2 funded-track-record evidence. */
        <CompareCallBody callA={callA} callB={callB} onClearNode={onClearNode} />
      ) : (
        /* Structure-level compare (unchanged). */
        <>
          {/* Two-column programme headers */}
          <Box className="compare-drawer__columns">
            <CompareNodeHeader node={nodeA} onClear={() => onClearNode?.(0)} />
            <CompareNodeHeader node={nodeB} onClear={() => onClearNode?.(1)} />
          </Box>

          {/* Metric rows */}
          <Box className="compare-drawer__metrics">
            <CompareMetricRow
              label="TOTAL BUDGET"
              badge="advertised"
              valueA={formatBudget(metricsA?.totalBudget)}
              valueB={formatBudget(metricsB?.totalBudget)}
            />
            <CompareMetricRow
              label="PILLARS / STRANDS"
              valueA={formatNumber(metricsA?.pillarsOrStrands)}
              valueB={formatNumber(metricsB?.pillarsOrStrands)}
            />
            <CompareMetricRow
              label="OPEN CALLS"
              valueA={formatNumber(metricsA?.openCalls)}
              valueB={formatNumber(metricsB?.openCalls)}
            />
            <CompareMetricRow
              label="AVG CALL SIZE"
              badge="advertised"
              valueA={formatBudget(metricsA?.avgCallSize)}
              valueB={formatBudget(metricsB?.avgCallSize)}
            />
            <CompareMetricRow
              label="TOPICS"
              valueA={formatNumber(metricsA?.topicCount)}
              valueB={formatNumber(metricsB?.topicCount)}
            />
          </Box>

          {/* Topic overlap */}
          <CompareTopicOverlap
            sharedTopics={sharedTopics}
            topOverlap={topOverlap}
            topicCountA={metricsA?.topicCount || 0}
            topicCountB={metricsB?.topicCount || 0}
          />
        </>
      )}
    </Box>
  );

  return typeof document !== "undefined" ? createPortal(card, document.body) : card;
}
