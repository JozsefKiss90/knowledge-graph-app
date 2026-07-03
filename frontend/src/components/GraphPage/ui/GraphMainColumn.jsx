// src/components/GraphPage/ui/GraphMainColumn.jsx
import React, { useCallback, useEffect, useRef } from "react";
import { Col } from "react-bootstrap";

import NestedGraphController from "../../NestedGraphController";
import HoveredNodeInfo from "../HoveredNodeInfo/HoveredNodeInfo";
import GraphStatusBar from "./GraphStatusBar";
import GraphConstraintBar from "./GraphConstraintBar";
import NodeDetail from "../../NodeDetail";
import TimelineScrubber from "../TimelineScrubber/TimelineScrubber";
// Adjust this import if your ChatBot lives elsewhere
import ChatBot from "../../ChatBot/ChatBot";
import { parseCallDate } from "../TimelineScrubber/utils";
import CompareDrawer from "../CompareDrawer/CompareDrawer";
import useCountryActivity from "../CountryActivity/useCountryActivity";
import CountryOverlayBadge from "../CountryActivity/CountryOverlayBadge";
import PortfolioDashboard from "../Dashboard/PortfolioDashboard";
import FindCallsPanel from "../FindCalls/FindCallsPanel";

// Lifts the nested controller's level-bar DATA (breadcrumbs) up to GraphPage
// after commit, where the global CommandBar renders it. Data only — the click
// callbacks are recreated on every controller render, so putting them in state
// would re-render GraphPage each pass (an update loop); they travel through
// levelNavRef instead.
function LevelBarSync({ levels, currentKey, canGoBack, onChange }) {
  useEffect(() => {
    onChange?.({ levels, currentKey, canGoBack });
  }, [levels, currentKey, canGoBack, onChange]);
  return null;
}

export default function GraphMainColumn({
  viewMode,
  setViewMode,
  graphName,
  setGraphName,
  loadFromStore,
  effectiveLayout,
  updateOption,
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
  findOpen,
  setFindOpen,
  dashboardPanel,
  setDashboardPanel,
  countryOverlayCode,
  setCountryOverlayCode,
  assistantMatchIds,
  assistantMatchDestIds,
  assistantFocus,
  assistantSource,
  onAssistantResults,
  onLocateCall,
  onClearAssistant,
  locateCall,
  onResetFilters,
  assistantQuery,
  onCopyLink,
  onSaveView,
  levelNavRef,
  navToken,
  savedViews,
  onApplySavedView,
  onDeleteSavedView,
  onLevelBarChange,
  assistantOpenSignal,
}) {
  const isDetailMode = !!detailNode;
  const levelsRef = useRef([]);
  const assistantFocusHandledRef = useRef(null);

  // The HE Wiki graph is a flat entity network — Compare/Timeline (cluster/Call tools) don't apply.
  const isHEWiki = graphName === "HE_2025";
  const heWikiMissing = isHEWiki && !loadFromStore?.("HE_2025");

  const layoutMode =
    effectiveLayout?.name === "breadthfirst" ? "breadthfirst" : "cose-bilkent";

  const handleLayoutModeChange = useCallback(
    (nextName) => {
      if (isHEWiki) return;
      // The name change flows into NestedGraphController, whose
      // [layoutOptions?.name] effect already reruns the layout with the correct
      // breadthfirst / cluster tree->force re-seeding. Running the layout again
      // here would be a second, un-special-cased pass that races the first, so
      // the toggle relies solely on the rerunLayout path.
      updateOption("name", nextName);
    },
    [isHEWiki, updateOption]
  );

  // B4: country-activity overlay data for the graph paint. The picker now lives in the dashboard tool panel,
  // so the paint is driven by the selected country itself (not a drawer-open flag); this fetch shares the
  // module cache with the panel's own fetch, so selecting a country costs a single request.
  const { data: countryData } = useCountryActivity(
    countryOverlayCode,
    !!countryOverlayCode && !isHEWiki
  );

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

  // A3: highlight assistant matches (and their parent destinations) on every
  // layer; dim everything else. Re-applies whenever the layer (and thus the
  // Cytoscape instance) changes, so matches glow wherever they appear.
  useEffect(() => {
    const cy = cyInstance;
    if (!cy || cy.destroyed?.()) return;

    const matchIds = assistantMatchIds || new Set();
    const matchDestIds = assistantMatchDestIds || new Set();

    cy.batch(() => {
      cy.nodes().removeClass("assistant-match assistant-dim");
      if (!matchIds.size) return;

      const calls = cy.nodes("[type = 'Call'], [category = 'Call']");
      const dests = cy.nodes("[type = 'Destination'], [category = 'Destination']");

      // Only dim a layer that actually contains a match — otherwise navigating to
      // an unrelated layer after a search would grey out everything (looks broken).
      const hasMatchHere =
        calls.filter((n) => matchIds.has(String(n.id()))).nonempty() ||
        dests.filter((n) => matchDestIds.has(String(n.id()))).nonempty();
      if (!hasMatchHere) return;

      calls.forEach((n) => {
        n.addClass(matchIds.has(String(n.id())) ? "assistant-match" : "assistant-dim");
      });
      dests.forEach((n) => {
        n.addClass(matchDestIds.has(String(n.id())) ? "assistant-match" : "assistant-dim");
      });
    });
  }, [cyInstance, graphName, assistantMatchIds, assistantMatchDestIds]);

  // B4: country-activity overlay. Paint the call nodes for the chosen country — green if it LED
  // (coordinated) a funded project in the area, lighter green if it JOINED (partnered), dimmed if the area
  // is EU-funded but the country has no recorded activity there. Calls with NO CORDIS data are left neutral
  // (we never imply "inactive" where we have no data). Re-applies on every layer change so the paint follows
  // the country wherever call nodes appear; clearing the country (picking "Select a country…" in the
  // dashboard panel) wipes the classes.
  useEffect(() => {
    const cy = cyInstance;
    if (!cy || cy.destroyed?.()) return;
    const calls = cy.nodes("[type = 'Call'], [category = 'Call']");
    cy.batch(() => {
      calls.removeClass("country-coord country-part country-dim");
      if (!countryOverlayCode || !countryData) return;
      const coord = new Set((countryData.coordinatedCallIds || []).map(String));
      const active = new Set((countryData.activeCallIds || []).map(String));
      const covered = new Set((countryData.coveredCallIds || []).map(String));
      calls.forEach((n) => {
        const id = String(n.id());
        if (coord.has(id)) n.addClass("country-coord");
        else if (active.has(id)) n.addClass("country-part");
        else if (covered.has(id)) n.addClass("country-dim");
        // else: no CORDIS data for this call → leave neutral
      });
    });
  }, [cyInstance, graphName, countryOverlayCode, countryData]);

  // A3: once navigation has reached the layer where the focused call is visible,
  // center it and add a brief focus ring. Fires once per focus token (seq) per
  // layer; a fresh click bumps seq so re-clicking the same result re-fires.
  // Waits for the post-mount auto-fit to settle, then pans (not fits) so it
  // doesn't fight applyResponsiveViewport.
  useEffect(() => {
    const cy = cyInstance;
    const focusId = assistantFocus?.id;
    const focusSeq = assistantFocus?.seq;
    if (!cy || cy.destroyed?.() || !focusId) return;

    let node;
    try {
      node = cy.$id(String(focusId));
    } catch {
      return;
    }
    if (!node || node.empty() || !node.visible()) return; // not on this layer yet

    const stamp = `${focusSeq}@${graphName}`;
    if (assistantFocusHandledRef.current === stamp) return;
    assistantFocusHandledRef.current = stamp;

    let ringTimer = null;
    const t = setTimeout(() => {
      if (cy.destroyed?.()) return;
      try {
        cy.animate({ center: { eles: node }, duration: 400, easing: "ease-in-out" });
      } catch {}
      cy.nodes().removeClass("assistant-focus"); // clear any prior ring on this layer
      node.addClass("assistant-focus");
      ringTimer = setTimeout(() => {
        try {
          if (!cy.destroyed?.()) node.removeClass("assistant-focus");
        } catch {}
      }, 2400);
    }, 700);

    return () => {
      clearTimeout(t);
      if (ringTimer) clearTimeout(ringTimer);
    };
  }, [cyInstance, graphName, assistantFocus]);

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
            onOpenResearchFields={() => {
              setViewMode("dashboard");
              setDashboardPanel("fields");
            }}
          />
        </div>
      ) : viewMode === "dashboard" ? (
        // DASHBOARD MODE — the global CommandBar carries breadcrumbs/actions now.
        <PortfolioDashboard
          loadFromStore={loadFromStore}
          graphStats={graphStats}
          setViewMode={setViewMode}
          dashboardPanel={dashboardPanel}
          setDashboardPanel={setDashboardPanel}
          countryOverlayCode={countryOverlayCode}
          setCountryOverlayCode={setCountryOverlayCode}
          onLocateCall={onLocateCall}
          locateCall={locateCall}
          savedViews={savedViews}
          onApplySavedView={onApplySavedView}
          onDeleteSavedView={onDeleteSavedView}
        />
      ) : (
        // GRAPH MODE: original graph layout (top bar + canvas + status bar + chatbot)
        <>
          <NestedGraphController
            initialGraphName="ROOT"
            layoutOptions={effectiveLayout}
            loadFromStore={loadFromStore}
            navToken={navToken}
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
              // Lift the layer nav callbacks so GraphPage's Backspace / ← shortcut
              // and the CommandBar breadcrumbs can drive the level stack.
              if (levelNavRef) levelNavRef.current = { canGoBack, onBack, onLevelClick };

              return (
                <>
                  <LevelBarSync
                    levels={levels}
                    currentKey={currentKey}
                    canGoBack={canGoBack}
                    onChange={onLevelBarChange}
                  />
                  <GraphConstraintBar
                    timelineSelection={timelineSelection}
                    onClearTimeline={() => setTimelineSelection(null)}
                    countryCode={!isHEWiki ? countryOverlayCode : ""}
                    onClearCountry={() => setCountryOverlayCode("")}
                    assistantCount={assistantMatchIds?.size || 0}
                    assistantQuery={assistantQuery}
                    assistantSource={assistantSource}
                    onClearAssistant={onClearAssistant}
                    compareCount={compareNodes?.length || 0}
                    onClearCompare={() => setCompareNodes([])}
                    onResetFilters={onResetFilters}
                  />
                </>
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
            {/* B4: while a country overlay is painting the call nodes, surface a legend + clear control on the
                graph itself — the picker lives in the dashboard panel, so this is the only place the paint is
                actually visible. */}
            <CountryOverlayBadge
              country={!isHEWiki ? countryOverlayCode : ""}
              onClear={() => setCountryOverlayCode("")}
            />

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

            <ChatBot
              onOpenDetail={onOpenDetail}
              onAssistantResults={onAssistantResults}
              onLocateCall={onLocateCall}
              onClearAssistant={onClearAssistant}
              locateCall={locateCall}
              openSignal={assistantOpenSignal}
            />

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

          <FindCallsPanel
            open={findOpen && !isHEWiki}
            onClose={() => setFindOpen(false)}
            loadFromStore={loadFromStore}
            onAssistantResults={onAssistantResults}
            onLocateCall={onLocateCall}
            onClearAssistant={onClearAssistant}
            locateCall={locateCall}
            onOpenDetail={onOpenDetail}
          />

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
            layoutMode={layoutMode}
            onLayoutModeChange={handleLayoutModeChange}
            layoutSwitchVisible={!isHEWiki}
          />
        </>
      )}
    </Col>
  );
}
