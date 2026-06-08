// src/components/GraphPage/ui/GraphMainColumn.jsx
import React, { useCallback, useEffect, useRef } from "react";
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
import CompareDrawer from "../CompareDrawer/CompareDrawer";
import PortfolioDashboard from "../Dashboard/PortfolioDashboard";

export default function GraphMainColumn({
  viewMode,
  setViewMode,
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
  compareOpen,
  setCompareOpen,
  compareNodes,
  setCompareNodes,
}) {
  const isDetailMode = !!detailNode;
  const levelsRef = useRef([]);

  // The HE Wiki graph is a flat entity network — Compare/Timeline (cluster/Call tools) don't apply.
  const isHEWiki = graphName === "HE_2025";
  const heWikiMissing = isHEWiki && !loadFromStore?.("HE_2025");

  // Compare selection handler: adds a node to compareNodes (max 2)
  const handleCompareSelect = useCallback(
    (nodeData, cyNode) => {
      if (!nodeData) return;
      const id = nodeData.programmeKey || nodeData.id;
      const visual = (() => {
        if (!cyNode) return null;
        try {
          const fill = typeof cyNode.style === "function" ? cyNode.style("background-color") : null;
          const borderColor = typeof cyNode.style === "function" ? cyNode.style("border-color") : null;
          return { fill: fill || "#3d8fff", borderColor: borderColor || "#fff", borderWidthPx: 2 };
        } catch { return null; }
      })();

      setCompareNodes((prev) => {
        // Don't add duplicates
        if (prev.some((n) => (n.programmeKey || n.id) === id)) return prev;
        const entry = { ...nodeData, nodeVisual: visual };
        if (prev.length < 2) return [...prev, entry];
        // Replace second node
        return [prev[0], entry];
      });
    },
    [setCompareNodes]
  );

  // Only active when compareOpen is true (never for the HE Wiki graph)
  const compareSelectCallback = compareOpen && !isHEWiki ? handleCompareSelect : null;

  // Sync compare-selected Cytoscape class with compareNodes state
  useEffect(() => {
    const cy = cyInstance;
    if (!cy || cy.destroyed?.()) return;
    cy.nodes().removeClass("compare-selected");
    if (!compareOpen || !compareNodes?.length) return;
    compareNodes.forEach((n) => {
      const id = n.id;
      if (!id) return;
      try {
        const el = cy.$id(String(id));
        if (el && !el.empty()) el.addClass("compare-selected");
      } catch {}
    });
  }, [cyInstance, compareOpen, compareNodes]);

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
      ) : viewMode === "dashboard" ? (
        // DASHBOARD MODE
        <>
          <GraphTopBar
            levels={levelsRef.current}
            currentKey={graphName}
            onLevelClick={() => {}}
            canGoBack={false}
            onBack={() => {}}
            onResetView={onResetView}
            onFitView={onFitView}
            layoutMode="cose-bilkent"
            compareOpen={false}
            compareNodes={[]}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onLayoutModeChange={() => {}}
          />
          <PortfolioDashboard
            loadFromStore={loadFromStore}
            graphStats={graphStats}
            setViewMode={setViewMode}
          />
          <GraphStatusBar
            nodes={graphStats.nodes}
            edges={graphStats.edges}
            layoutLabel="Dashboard view"
          />
        </>
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
                  compareOpen={compareOpen}
                  compareNodes={compareNodes}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
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
            onCompareSelect={compareSelectCallback}
          />

          {heWikiMissing && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  pointerEvents: "auto",
                  maxWidth: 440,
                  textAlign: "center",
                  background: "rgba(15,23,42,0.88)",
                  color: "#e5edff",
                  border: "1px solid rgba(148,163,184,0.35)",
                  borderRadius: 12,
                  padding: "16px 20px",
                }}
              >
                <strong>HE Wiki graph unavailable</strong>
                <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
                  The <code>/hewiki</code> data could not be loaded from the backend.
                  Start the backend and run <code>POST /hewiki/populate</code>, then reload the page.
                </div>
              </div>
            </div>
          )}

          <div className="graph-main">
            <HoveredNodeInfo
              node={hoveredNode}
              cyInstance={cyInstance}
              graphName={graphName}
              onClose={() => {
                hoveredNodeRef.current = null;
                setHoveredNode(null);
              }}
              // "View Details" from hover card
              onOpenDetail={onOpenDetail}
            />

            <ChatBot onOpenDetail={onOpenDetail} />

            <CompareDrawer
              open={compareOpen && !isHEWiki}
              nodes={compareNodes}
              loadFromStore={loadFromStore}
              onClose={() => {
                setCompareOpen(false);
                setCompareNodes([]);
              }}
              onClearNode={(index) => {
                setCompareNodes((prev) => prev.filter((_, i) => i !== index));
              }}
            />
          </div>

          <TimelineScrubber
            loadFromStore={loadFromStore}
            currentKey={graphName}
            levels={levelsRef.current}
            isOpen={timelineOpen && !isDetailMode && !isHEWiki}
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
