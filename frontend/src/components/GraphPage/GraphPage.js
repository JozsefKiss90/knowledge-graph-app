import { useRef, useState, useEffect, useMemo } from "react";
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

  const [graphStats, setGraphStats] = useState({ nodes: 0, edges: 0 });

  const { layoutOptions: userLayout, updateOption } = useLayoutOptions();

  const bookmarksCount = useBookmarksCount();

  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const callDetailCacheRef = useRef(new Map()); // callId -> detail JSON

  // Clear hover card when the active graph / layer changes
  useEffect(() => {
    hoveredNodeRef.current = null;
    setHoveredNode(null);
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

  const { layoutLabel, handleResetView, handleFitView, handleApplyLayout } = createViewControls({
    cyInstance,
    effectiveLayout,
  });

  if (!ready) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100">
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
          <Row className="flex-grow-1 w-100 g-0" style={{ flexWrap: "nowrap", minWidth: 0, minHeight: 0 }}>
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
              graphName={graphName}
              setGraphName={setGraphName}
              loadFromStore={loadFromStore}
              effectiveLayout={effectiveLayout}
              updateOption={updateOption}
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
            />
          </Row>
        </Container>
      </div>
    </CyContext.Provider>
  );
}

export default GraphPage;
