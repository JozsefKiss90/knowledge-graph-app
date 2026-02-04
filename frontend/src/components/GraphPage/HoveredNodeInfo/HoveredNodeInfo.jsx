// src/components/GraphPage/HoveredNodeInfo/HoveredNodeInfo.jsx
import React, { useEffect, useMemo } from "react";
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

export default function HoveredNodeInfo({
  node,
  cyInstance,
  onClose,
  graphName,
  isHoverFrozen = false,
  // NEW: optional inline detail handler
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

  const { positionStyle } = useHoverCardPosition({
    hoverPosition,
    dragPos,
    cardSize,
  });

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

    // Prefer inline detail if handler provided
    if (typeof onOpenDetail === "function") {
      onOpenDetail(payload);
      onClose?.();
      return;
    }

    // Fallback: legacy route navigation
    navigate(`/node/${safeId}`, {
      state: {
        nodeData: node ?? null,
        returnLayerKey,
        returnGraphName,
      },
    });
    onClose?.();
  };

  const card = (
    <HoverCardShell
      cardRef={cardRef}
      positionStyle={positionStyle}
      onPointerDown={startDrag}
      onClose={onClose}
      maxHeight="min(520px, calc(100vh - 24px))"
    >
      <HoverCardHeader
        title={model.title}
        titleFull={model.titleFull}
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

          {model.isClusterNode ? (
            <MetricCards
              items={[
                {
                  key: "summary",
                  label: "Summary",
                  value: model.clusterSummary || "—",
                  variant: "text",
                  fullWidth: true,
                },
              ]}
            />
          ) : null}

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
