// src/components/GraphPage/GraphPage.js
import { useRef, useState, useEffect, useMemo, useCallback  } from "react";
import { Container, Row } from "react-bootstrap";
import CircularProgress from "@mui/material/CircularProgress";

import { CyContext } from "../context/CyContext";
import { useDarkMode } from "../context/DarkModeContext";

import { useLayoutOptions } from "./useLayoutOptions";
import { useGraphData } from "./useGraphData";

import { layoutConfig } from "../utils/layoutConfig";

import { useBookmarksCount } from "./hooks/useBookmarksCount";
import { usePendingNav } from "./hooks/usePendingNav";
import { useHoverHydration } from "./hooks/useHoverHydration";
import { useLegendFit } from "./hooks/useLegendFit";

import { computeEffectiveLayout } from "./utils/computeEffectiveLayout";
import { createViewControls } from "./utils/viewControls";

import GraphAppHeader from "./ui/GraphAppHeader";
import LeftLegendColumn from "./ui/LeftLegendColumn";
import GraphMainColumn from "./ui/GraphMainColumn";
import RightControlsColumn from "./ui/RightControlsColumn";

function GraphPage() {
  const { ready, graphName, setGraphName, loadFromStore } = useGraphData();

  const [pendingNav, setPendingNav] = useState(null);
  const [cyInstance, setCyInstance] = useState(null);

  const hoveredNodeRef = useRef(null);

  const { darkMode, setDarkMode } = useDarkMode();

  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);
  const [isMessageDrawerOpen, setIsMessageDrawerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Compare drawer state
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareNodes, setCompareNodes] = useState([]);

  const [graphStats, setGraphStats] = useState({ nodes: 0, edges: 0 });

  const [viewMode, setViewMode] = useState("graph"); // "graph" | "dashboard"

  const [timelineOpen, setTimelineOpen] = useState(true);
  const [timelineSelection, setTimelineSelection] = useState(null);
  // timelineSelection: { start: Date, end: Date } | null (null = show all)

  const { layoutOptions: userLayout, updateOption } = useLayoutOptions();

  const bookmarksCount = useBookmarksCount();

  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const callDetailCacheRef = useRef(new Map()); // callId -> detail JSON

  // NEW: inline node detail state (for NodeDetail overlay)
  const [detailNode, setDetailNode] = useState(null);

    const handleOpenDetail = useCallback((payload) => {
    // Clear any hover card when opening details
    hoveredNodeRef.current = null;
    setHoveredNode(null);
    setDetailNode(payload || null);
  }, []);

  const handleCloseDetail = useCallback(() => {
    // Inline detail is rendered on top of the already active graph view.
    // So “Back to Graph” should only dismiss the detail overlay and must not
    // mutate graphName / pendingNav, otherwise the parent graph state and the
    // NestedGraphController level stack can drift apart.
    hoveredNodeRef.current = null;
    setHoveredNode(null);
    setDetailNode(null);
  }, []);


  // Clear hover card when the active graph / layer changes
  useEffect(() => {
    hoveredNodeRef.current = null;
    setHoveredNode(null);
    setDetailNode(null); // also close inline detail on dataset change
    setTimelineSelection(null); // reset timeline filter on layer change
    setCompareNodes([]); // reset compare selection on layer change
  }, [graphName]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pendingNav");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.clusterKey || parsed.destinationId || parsed.callId)) {
        setPendingNav(parsed);
      }
    } catch {}
  }, []);

  // Compute effective layout (memoized)
  const effectiveLayout = useMemo(() => {
    const isTreeLayout = userLayout?.name === "breadthfirst";
    const base =
      graphName === "HE_2025"
        ? layoutConfig.HE_2025
        : isTreeLayout
        ? layoutConfig.DEFAULT_TREE
        : layoutConfig.DEFAULT;

    return computeEffectiveLayout({ base, userLayout });
  }, [graphName, userLayout]);

  // Pending navigation (cluster -> destination -> call)
  usePendingNav({
    pendingNav,
    setPendingNav,
    cyInstance,
    graphName,
    setGraphName,
  });

  useEffect(() => {
    if (pendingNav == null) localStorage.removeItem("pendingNav");
  }, [pendingNav]);

  // Keep GraphStatusBar counts in sync with Cytoscape
useEffect(() => {
  const cy = cyInstance;
  if (!cy) return;

  const update = () => {
    try {
      setGraphStats({
        nodes: cy.nodes().length,
        edges: cy.edges().length,
      });
    } catch {
      // no-op
    }
  };

  // initial update as soon as cy is ready
  update();

  // update on structure/layout changes
  cy.on("add remove", update);
  cy.on("layoutstop", update);

  // (optional) also update when visibility changes are used instead of add/remove
  cy.on("style", update);

  return () => {
    try {
      cy.off("add remove", update);
      cy.off("layoutstop", update);
      cy.off("style", update);
    } catch {
      // no-op
    }
  };
}, [cyInstance]);


  // Hover hydration (polling)
  useHoverHydration({
    cyInstance,
    graphName,
    hoveredNodeRef,
    setHoveredNode,
    loadFromStore,
    callDetailCacheRef,
  });

  // Smooth fit when legend collapses/expands
  useLegendFit({ cyInstance, isLegendCollapsed });

  const { layoutLabel, handleResetView, handleFitView, handleApplyLayout } =
    createViewControls({
      cyInstance,
      effectiveLayout,
    });

    if (!ready) {
      return (
        <div
          className="d-flex align-items-center justify-content-center"
          style={{ width: "100vw", height: "100vh" }}
        >
          <CircularProgress color="primary" />
        </div>
      );
    }

  return (
    <CyContext.Provider value={cyInstance}>
      <div className="graph-shell">
        <GraphAppHeader />

        {/* IMPORTANT: keep Bootstrap Container/Row so Col sizing works correctly on mobile */}
        <Container
          fluid
          className="flex-grow-1 d-flex flex-column p-0 graph-container"
          style={{ flexWrap: "nowrap", minWidth: 0, minHeight: 0 }}
        >
          <Row
            className="flex-grow-1 w-100 g-0"
            style={{ flexWrap: "nowrap", minWidth: 0, minHeight: 0 }}
          >
            <LeftLegendColumn
              isLegendCollapsed={isLegendCollapsed}
              setIsLegendCollapsed={setIsLegendCollapsed}
              hoveredNodeRef={hoveredNodeRef}
              graphName={graphName}
              loadFromStore={loadFromStore}
              onRequestNavigate={(req) => setPendingNav(req)}
              setGraphName={setGraphName}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
            />

            <GraphMainColumn
              viewMode={viewMode}
              setViewMode={setViewMode}
              graphName={graphName}
              setGraphName={setGraphName}
              loadFromStore={loadFromStore}
              effectiveLayout={effectiveLayout}
              updateOption={updateOption}
              onApplyLayout={handleApplyLayout}
              onGraphStats={setGraphStats}
              onCyReady={setCyInstance}
              onNodeHover={(node) => {
                hoveredNodeRef.current = node || null;
              }}
              hoveredNode={hoveredNode}
              setHoveredNode={setHoveredNode}
              hoveredNodeRef={hoveredNodeRef}
              cyInstance={cyInstance}
              graphStats={graphStats}
              layoutLabel={layoutLabel}
              onResetView={handleResetView}
              onFitView={handleFitView}
              detailNode={detailNode}
              onOpenDetail={handleOpenDetail}
              onCloseDetail={handleCloseDetail}
              timelineOpen={timelineOpen}
              timelineSelection={timelineSelection}
              setTimelineSelection={setTimelineSelection}
              compareOpen={compareOpen}
              setCompareOpen={setCompareOpen}
              compareNodes={compareNodes}
              setCompareNodes={setCompareNodes}
            />

            <RightControlsColumn
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              isMessageDrawerOpen={isMessageDrawerOpen}
              setIsMessageDrawerOpen={setIsMessageDrawerOpen}
              drawerOpen={drawerOpen}
              setDrawerOpen={setDrawerOpen}
              layoutOptions={effectiveLayout}
              updateOption={updateOption}
              handleApplyLayout={handleApplyLayout}
              bookmarksCount={bookmarksCount}
              timelineOpen={timelineOpen}
              setTimelineOpen={setTimelineOpen}
              compareOpen={compareOpen}
              setCompareOpen={setCompareOpen}
            />
          </Row>
        </Container>
      </div>
    </CyContext.Provider>
  );
}

export default GraphPage;
