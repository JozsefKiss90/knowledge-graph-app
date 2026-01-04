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

/**
 * HoveredNodeInfo (composition root)
 * IMPORTANT: Keep the legacy public signature expected by GraphPage:
 *   <HoveredNodeInfo node={hoveredNode} cyInstance={cyInstance} onClose={...} />
 *
 * graphName is OPTIONAL (GraphPage passes it in newer builds); if missing we fall back
 * to cyInstance.scratch("graphName") inside the view-model.
 */
export default function HoveredNodeInfo({
  node,
  cyInstance,
  onClose,
  graphName,
  isHoverFrozen = false,
}) {
  const navigate = useNavigate();

  // Derive anchor from the node itself (legacy behavior: node.__screenPosition)
  const hoverPosition = useMemo(() => {
    const sp = node?.__screenPosition;
    if (!sp) return null;
    return { x: sp.x, y: sp.y };
  }, [node?.__screenPosition]);

  // 1) View model
  const model = useHoveredNodeModel({
    hoveredNode: node,
    cyInstance,
    graphName,
    isHoverFrozen,
  });

  // 2) Measure card
  const { cardRef, cardSize } = useHoverCardMeasure();

  // 3) Drag
  const { dragPos, startDrag, resetDrag } = useHoverCardDrag({ cardRef });

  // Reset drag when node changes
  useEffect(() => {
    resetDrag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model?.id]);

  // 4) Auto-position
  const { positionStyle } = useHoverCardPosition({
    hoverPosition,
    dragPos,
    cardSize,
  });

  if (!model) return null;

  const handleViewDetails = () => {
    if (!model.id) return;
    navigate(`/node/${encodeURIComponent(String(model.id))}`);
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
        chips={{
          typeLabel: model.typeLabel,
          showType: model.shouldShowHeaderChips,
          showPinned: model.isHoverFrozen,

          // Destination: show Calls chip only if we have a real count
          showCallCount: model.isDestinationNode && typeof model.destinationCallCount === "number",
          callCount: model.destinationCallCount,

          // Cluster: show Destinations chip only if we have a real count
          showDestCount: model.isClusterNode && typeof model.clusterDestinationCount === "number",
          destCount: model.clusterDestinationCount,
          destLabel: "Destinations",
        }}
      />

      {model.renderDestinationMinimal ? (
        <>
          {model.tags?.length > 0 && <TagChips title="Related Topics" tags={model.tags} />}
          {model.showViewDetails && <ViewDetailsButton onClick={handleViewDetails} />}
        </>
      ) : (
        <>
          {model.metricCards?.length > 0 && <MetricCards items={model.metricCards} />}

          {model.clusterSummary ? (
            <MetricCards
              items={[
                {
                  key: "summary",
                  label: "Summary",
                  value: model.clusterSummary,
                  variant: "text",
                  fullWidth: true,
                },
              ]}
            />
          ) : null}

          {model.tags?.length > 0 && <TagChips title="Related Topics" tags={model.tags} />}
          {model.showViewDetails && <ViewDetailsButton onClick={handleViewDetails} />}
        </>
      )}
    </HoverCardShell>
  );

  return typeof document !== "undefined" ? createPortal(card, document.body) : card;
}
