import React from "react";
import { createPortal } from "react-dom";
import { Box, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";

import CompareNodeHeader from "./CompareNodeHeader";
import CompareMetricRow from "./CompareMetricRow";
import CompareTopicOverlap from "./CompareTopicOverlap";
import { useCompareData } from "./useCompareData";

function formatBudget(value) {
  if (!value || !Number.isFinite(value) || value === 0) return "N/A";
  if (value >= 1e9) return `\u20AC${(value / 1e9).toFixed(1)} B`;
  if (value >= 1e6) return `\u20AC${(value / 1e6).toFixed(1)} M`;
  if (value >= 1e3) return `\u20AC${(value / 1e3).toFixed(1)} K`;
  return `\u20AC${value.toLocaleString()}`;
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

  const { metricsA, metricsB, sharedTopics, topOverlap } = useCompareData(
    nodeA,
    nodeB,
    loadFromStore
  );

  if (!open) return null;

  const hasBothNodes = nodeA && nodeB;

  const card = (
    <Box className="compare-drawer">
      {/* Header */}
      <Box className="compare-drawer__header">
        <CompareArrowsIcon sx={{ fontSize: 20, color: "var(--primary)" }} />
        <Typography sx={{ fontWeight: 700, fontSize: 15, flex: 1 }}>
          Compare programmes
        </Typography>
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
            {nodes.length === 0
              ? "Click two programmes on the graph to compare them"
              : "Click one more programme to start comparing"}
          </Typography>

          {/* Show first selected node if any */}
          {nodeA && (
            <Box sx={{ mt: 2, textAlign: "left" }}>
              <CompareNodeHeader
                node={nodeA}
                onClear={() => onClearNode?.(0)}
              />
            </Box>
          )}
        </Box>
      ) : (
        /* Full comparison */
        <>
          {/* Two-column programme headers */}
          <Box className="compare-drawer__columns">
            <CompareNodeHeader
              node={nodeA}
              onClear={() => onClearNode?.(0)}
            />
            <CompareNodeHeader
              node={nodeB}
              onClear={() => onClearNode?.(1)}
            />
          </Box>

          {/* Metric rows */}
          <Box className="compare-drawer__metrics">
            <CompareMetricRow
              label="TOTAL BUDGET"
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
          />
        </>
      )}
    </Box>
  );

  return typeof document !== "undefined" ? createPortal(card, document.body) : card;
}
