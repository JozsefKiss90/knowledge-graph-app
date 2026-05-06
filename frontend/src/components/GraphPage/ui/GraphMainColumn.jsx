// src/components/GraphPage/ui/GraphMainColumn.jsx
import React, { useEffect, useRef } from "react";
import { Col } from "react-bootstrap";

import NestedGraphController from "../../NestedGraphController";
import HoveredNodeInfo from "../HoveredNodeInfo/HoveredNodeInfo";
import GraphStatusBar from "./GraphStatusBar";
import GraphTopBar from "./GraphTopBar";
import NodeDetail from "../../NodeDetail";
import TimelineScrubber from "../TimelineScrubber/TimelineScrubber";
// Adjust this import if your ChatBot lives elsewhere
import ChatBot from "../../ChatBot/ChatBot";
import { parseCallDate } from "../TimelineScrubber/utils";

export default function GraphMainColumn({
  graphName,
  setGraphName,
  loadFromStore,
  effectiveLayout,
  updateOption,
  onApplyLayout,
  onGraphStats,
  onCyReady,
  onNodeHover,
  hoveredNode,
  setHoveredNode,
  hoveredNodeRef,
  cyInstance,
  graphStats,
  layoutLabel,
  onResetView,
  onFitView,
  detailNode,
  onOpenDetail,
  onCloseDetail,
  timelineOpen,
  timelineSelection,
  setTimelineSelection,
}) {
  const isDetailMode = !!detailNode;
  const levelsRef = useRef([]);

  // Apply timeline date filtering to Cytoscape call nodes
  useEffect(() => {
    const cy = cyInstance;
    if (!cy || cy.destroyed?.()) return;

    const callNodes = cy.nodes("[type = 'Call'], [category = 'Call']");
    if (callNodes.empty()) return;

    if (!timelineSelection) {
      // No filter: remove timeline-hidden from all
      callNodes.removeClass("timeline-hidden");
      return;
    }

    const { start, end } = timelineSelection;

    callNodes.forEach((node) => {
      const data = node.data();
      const openDate = parseCallDate(
        data.opening_date ?? data.openingDate ?? data.start_date ?? data.startDate
      );

      let closeDate = parseCallDate(data.deadline);
      if (!closeDate && Array.isArray(data.deadlines) && data.deadlines.length > 0) {
        const parsed = data.deadlines.map(parseCallDate).filter(Boolean);
        if (parsed.length > 0) closeDate = parsed.reduce((a, b) => (a > b ? a : b));
      }
      if (!closeDate) {
        closeDate = parseCallDate(data.closing_date ?? data.closingDate ?? data.end_date ?? data.endDate);
      }

      // If no dates at all, leave visible
      if (!openDate && !closeDate) {
        node.removeClass("timeline-hidden");
        return;
      }

      const cOpen = openDate || closeDate;
      const cClose = closeDate || openDate;

      // Check overlap: call [cOpen, cClose] with selection [start, end]
      const overlaps = cOpen <= end && cClose >= start;
      if (overlaps) {
        node.removeClass("timeline-hidden");
      } else {
        node.addClass("timeline-hidden");
      }
    });
  }, [cyInstance, timelineSelection]);

  return (
    <Col
      className="d-flex flex-column p-0 graph-main-column"
      style={{ minWidth: 0, minHeight: 0 }}
    >
      {isDetailMode ? (
        // NODE DETAIL MODE: fills the column, scrolls inside
        <div className="graph-detail-shell">
          <NodeDetail
            embeddedId={detailNode.id}
            embeddedNodeData={detailNode.nodeData || detailNode.data || null}
            onBack={onCloseDetail}
          />
        </div>
      ) : (
        // GRAPH MODE: original graph layout (top bar + canvas + status bar + chatbot)
        <>
          <NestedGraphController
            initialGraphName="ROOT"
            layoutOptions={effectiveLayout}
            loadFromStore={loadFromStore}
            onGraphStats={onGraphStats}
            onCyReady={(cy) => onCyReady?.(cy)}
            onNodeHover={onNodeHover}
            onHoverNodeIdChange={() => {}}
            onLevelChange={(key) => {
              setGraphName(key);
              hoveredNodeRef.current = null;
              setHoveredNode(null);
            }}
            targetGraphName={graphName}
            renderLevelBar={({
              levels,
              currentKey,
              onLevelClick,
              canGoBack,
              onBack,
            }) => {
               levelsRef.current = levels;
               const layoutSwitchVisible = currentKey !== "HE_2025";

              const layoutMode =
                effectiveLayout.name === "breadthfirst"
                  ? "breadthfirst"
                  : "cose-bilkent";

              return (
                <GraphTopBar
                  levels={levels}
                  currentKey={currentKey}
                  onLevelClick={onLevelClick}
                  canGoBack={canGoBack}
                  onBack={onBack}
                  onResetView={onResetView}
                  onFitView={onFitView}
                  layoutMode={layoutMode}
                  layoutSwitchVisible={layoutSwitchVisible}
                  onLayoutModeChange={(nextName) => {
                    if (currentKey === "HE_2025") return;

                    updateOption("name", nextName);
                    onApplyLayout?.({
                      ...effectiveLayout,
                      name: nextName,
                    });
                  }}
                />
              );
            }}
            // for clicks in GraphView/setupEvents
            onOpenDetail={onOpenDetail}
          />

          <div className="graph-main">
            <HoveredNodeInfo
              node={hoveredNode}
              cyInstance={cyInstance}
              graphName={graphName}
              onClose={() => {
                hoveredNodeRef.current = null;
                setHoveredNode(null);
              }}
              // “View Details” from hover card
              onOpenDetail={onOpenDetail}
            />

            <ChatBot />
          </div>

          <TimelineScrubber
            loadFromStore={loadFromStore}
            currentKey={graphName}
            levels={levelsRef.current}
            isOpen={timelineOpen && !isDetailMode}
            onSelectionChange={setTimelineSelection}
          />

          <GraphStatusBar
            nodes={graphStats.nodes}
            edges={graphStats.edges}
            layoutLabel={layoutLabel}
          />
        </>
      )}
    </Col>
  );
}
