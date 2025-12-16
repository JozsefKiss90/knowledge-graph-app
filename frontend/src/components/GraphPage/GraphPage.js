// GraphPage.js
import { useRef, useState, useEffect, useCallback } from "react";
import { Container, Row, Col } from "react-bootstrap";
import NestedGraphController from "../NestedGraphController";
import { CyContext } from "../context/CyContext";
import CircularProgress from "@mui/material/CircularProgress";
import { useLayoutOptions } from "./useLayoutOptions";
import { useDarkMode } from "../context/DarkModeContext";
import "../../styles/main.scss";
import { useGraphData } from "./useGraphData";
import SidebarControls from "./SidebarControls";
import LegendToggle from "../LegendToggle";
import ArrowCircleRightIcon from "@mui/icons-material/ArrowCircleRight";
import ChatBot from "../ChatBot/ChatBot";
import { layoutConfig } from "../utils/layoutConfig";
import GraphStatusBar from "./GraphStatusBar";
import GraphTopBar from "./GraphTopBar";
import { IconButton } from "@mui/material";
import HoveredNodeInfo from "./HoveredNodeInfo"
import { getClusterConfigForId } from "../NodeDetalParts/useNodeDetail";

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
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

    // Clear hover card when the active graph / layer changes
  useEffect(() => {
    hoveredNodeRef.current = null;
    setHoveredNode(null);
  }, [graphName]);

  useEffect(() => {
  if (!pendingNav || !cyInstance || cyInstance.destroyed()) return;

  const clean = (k) => String(k || "").replace("_cose", "");
  const { clusterKey, destinationId, callId } = pendingNav;

  const currentKey = clean(graphName);
  const desiredDestKey = destinationId ? `DEST_${String(destinationId)}` : null;

  // If we're already in a DEST_ layer:
  if (currentKey.startsWith("DEST_") && destinationId) {
    // If we're NOT on the requested destination, go back to cluster first (to reopen another destination)
    if (currentKey !== desiredDestKey) {
      if (clusterKey) {
        setGraphName(clusterKey);
      }
      return;
    }

    // We ARE on the requested destination layer:
    // - if the request is only to open the destination, we are done
    if (!callId) {
      setPendingNav(null);
      return;
    }

    // - if we also need a call, proceed to tap the call below (do NOT bounce back to cluster)
  }

  // Ensure we are in the right cluster dataset before trying to open destination
  if (clusterKey && currentKey !== clusterKey && !currentKey.startsWith("DEST_")) {
    setGraphName(clusterKey);
    return;
  }

  // If we need a destination and we are currently on the cluster layer, tap it
  if (destinationId && currentKey === clusterKey) {
    const n = cyInstance.$id(String(destinationId));
    if (n && n.nonempty && n.nonempty()) {
      n.emit("tap"); // openDestinationLayer via setupEvents
      return;
    }
  }

  // If we need a call and we are on the correct DEST layer, tap it
  if (callId && currentKey.startsWith("DEST_")) {
    const n = cyInstance.$id(String(callId));
    if (n && n.nonempty && n.nonempty()) {
      n.emit("tap"); // setupEvents will navigate to details
      setPendingNav(null);
      return;
    }
  }

  // If request was only dataset switching, clear it
  if (!destinationId && !callId) {
    setPendingNav(null);
  }
}, [pendingNav, cyInstance, graphName, setGraphName]);

  useEffect(() => {
    let lastHoveredId = null;
    let cancelled = false;

  const hydrateHoveredNode = async (node) => {
    if (!node) {
      setHoveredNode(null);
      return;
    }

    // Always show the basic node immediately
    setHoveredNode(node);

      // Only hydrate Calls (Destination / others never hit the WP API)
    const isCall =
      node.type === "Call" || node.category === "Call";

    if (!isCall) return;

    try {
      const config = getClusterConfigForId(node.id);
      if (!config) return;

      const endpoint = config.buildNodeEndpoint(node.id);
      const res = await fetch(endpoint);
      if (!res.ok) {
        console.error(
          "Failed to hydrate hovered Call node:",
          node.id,
          res.status
        );
        return;
      }

      const detail = await res.json();

      // Only update if we’re still looking at the same node
      if (!cancelled && node.id === lastHoveredId) {
        setHoveredNode({ ...node, ...detail });
      }
    } catch (err) {
      console.error("Error hydrating hovered Call node:", err);
    }
  };

  const interval = setInterval(() => {
    const current = hoveredNodeRef.current;

    if (!current || !current.id) {
      if (lastHoveredId !== null) {
        lastHoveredId = null;
        setHoveredNode(null);
      }
      return;
    }

    if (current.id !== lastHoveredId) {
      lastHoveredId = current.id;
      hydrateHoveredNode(current);
    }
  }, 120); // small polling interval while hovering

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
  }, [hoveredNodeRef]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("bookmarkedCalls") || "[]");
    setBookmarksCount(stored.length);
  }, []);

  const isTreeLayout = userLayout?.name === "breadthfirst";

  const base =
    graphName === "HE_2025"
      ? layoutConfig.HE_2025
      : isTreeLayout
      ? layoutConfig.DEFAULT_TREE
      : layoutConfig.DEFAULT;

  const effectiveLayout = {
    ...base,
    ...userLayout,
    // keep whichever layout name is active
    name: userLayout?.name || base?.name || "cose-bilkent",
  };

  // smooth zoom when legend collapses/expands
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!cyInstance || cyInstance.destroyed()) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return; // do not override initial zoom
    }
  
     // When the sidebar width changes, just refit; do not impose a fixed zoom.
    try {
      cyInstance.fit({ eles: cyInstance.elements(), padding: 60 });
    } catch {
      /* ignore */
    }
  }, [isLegendCollapsed, cyInstance]);

  // ✅ keep node / edge counts in sync with the current Cytoscape instance
  useEffect(() => {
    if (!cyInstance || cyInstance.destroyed()) return;

    const updateStats = () => {
      setGraphStats({
        nodes: cyInstance.nodes().length,
        edges: cyInstance.edges().length,
      });
    }; 

    updateStats();
    cyInstance.on("add remove", updateStats);

    return () => {
      try {
        cyInstance.off("add remove", updateStats);
      } catch {
        /* ignore */
      }
    };
  }, [cyInstance]);

  // ⬇️ after all hooks, you can safely early-return
  if (!ready) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100">
        <CircularProgress color="primary" />
      </div>
    );
  }

  const layoutLabel =
  effectiveLayout.name === "breadthfirst"
    ? "Hierarchical Layout"
    : "Force-Directed Layout";

  const handleResetView = (initial = false) => {
    if (!cyInstance || cyInstance.destroyed()) return;
    cyInstance.elements().show();
    cyInstance.nodes().removeClass("faded highlighted");
    cyInstance.edges().removeClass("faded");
    cyInstance.nodes().unselect();
    // Make reset deterministic and identical everywhere
    cyInstance.fit({ padding: 60 });
    if (initial) {
      // optional: ensure no leftover pan/zoom state
      cyInstance.pan({ x: 0, y: 0 });
    }
  };
  const handleFitView = () => {
    if (!cyInstance || cyInstance.destroyed()) return;
    try {
      cyInstance.animate({
        fit: { eles: cyInstance.elements(), padding: 60 },
        duration: 300,
      });
    } catch {
      cyInstance.fit({ padding: 60 });
    }
  };

  return (
    <CyContext.Provider value={cyInstance}>
    <div className="graph-shell">
    <div className="graph-app-header">
    <div className="graph-app-logo">
      <span className="graph-app-logo-mark graph-app-logo-mask" aria-hidden="true" />
    </div>
        <div className="graph-app-header-text">
          <div className="graph-app-title">EU Research Knowledge Graph</div>
          <div className="graph-app-subtitle">
            Horizon Europe Strategic Planning Analytics
          </div>
        </div>
      </div>
    <Container
      fluid
      className="flex-grow-1 d-flex flex-column p-0 overflow-hidden graph-container"
    >        
      <Row className="flex-grow-1 w-100 g-0 legend-titles" style={{ flexWrap: "nowrap" }}>
          {/* LEFT SIDEBAR */}
          <Col
            xs="auto"
            className="p-0 sidebar-transition"
            style={{
              width: isLegendCollapsed ? 60 : 320,

              backgroundColor: darkMode ? "rgb(20, 43, 59)" : "rgb(233, 233, 233)",
              position: "relative",
            }}
          >
           {isLegendCollapsed ? (
              <div className="legend-collapsed-shell">
                <button
                  type="button"
                  className="legend-collapsed-toggle"
                  title="Expand filters & controls"
                  onClick={() => setIsLegendCollapsed(false)}
                >
                  <span className="legend-collapsed-icon">▸</span>
                  <span className="legend-collapsed-label">Filters</span>
                </button>
              </div>
            ) : (
            <LegendToggle
                hoveredNodeRef={hoveredNodeRef}
                graphName={graphName}
                loadFromStore={loadFromStore}
                onRequestNavigate={(req) => setPendingNav(req)}
                setGraphName={setGraphName}
                selectedNodeId={selectedNodeId}
                setSelectedNodeId={setSelectedNodeId}
                onCollapse={() => setIsLegendCollapsed(true)}
              />
            )}
          </Col>
          {/* MAIN GRAPH PANEL */}
          <Col className="d-flex flex-column p-0 overflow-hidden">
            <NestedGraphController
              initialGraphName="ROOT"
              layoutOptions={effectiveLayout}
              loadFromStore={loadFromStore}
              onCyReady={(cy) => {
                setCyInstance(cy);
                requestAnimationFrame(() => {
                  try { cy.fit({ padding: 60 }); } catch {}
                });
              }}
                onNodeHover={(node) => {
                hoveredNodeRef.current = node || null;
              }}
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
                const isRootLayer = currentKey === "ROOT";
                const isClusterLayer = currentKey.startsWith("Cluster_");
                const isDestinationLayer = currentKey.startsWith("DEST_");

                const layoutSwitchVisible =
                  (isRootLayer || isClusterLayer || isDestinationLayer) &&
                  graphName !== "HE_2025";

                const layoutMode =
                  effectiveLayout.name === "breadthfirst" ? "tree" : "force";

                return (
                  <GraphTopBar
                    levels={levels}
                    currentKey={currentKey}
                    onLevelClick={onLevelClick}
                    canGoBack={canGoBack}
                    onBack={onBack}
                    onResetView={handleResetView}
                    onFitView={handleFitView}
                    layoutMode={layoutMode}
                    layoutSwitchVisible={layoutSwitchVisible}
                    onLayoutModeChange={(mode) => {
                      if (!layoutSwitchVisible) return;
                      const nextName =
                        mode === "tree" ? "breadthfirst" : "cose-bilkent";
                      updateOption("name", nextName);
                    }}
                  />
                );
              }}
            />
            <div className="graph-main">
              <HoveredNodeInfo
                  node={hoveredNode}
                  cyInstance={cyInstance}
                  onClose={() => {
                     hoveredNodeRef.current = null;
                     setHoveredNode(null);
                  }}
              />
              {/* Chatbot bottom-right with toggle button */}
              <ChatBot />

            </div>

            {/* STATUS BAR AT BOTTOM */}
            <GraphStatusBar
              nodes={graphStats.nodes}
              edges={graphStats.edges}
              layoutLabel={layoutLabel}
            />
          </Col>
          {/* RIGHT ICONS PANEL */}
          <Col xs="auto">
            <SidebarControls
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              isMessageDrawerOpen={isMessageDrawerOpen}
              setIsMessageDrawerOpen={setIsMessageDrawerOpen}
              drawerOpen={drawerOpen}
              setDrawerOpen={setDrawerOpen}
              layoutOptions={effectiveLayout}
              updateOption={updateOption}
              handleApplyLayout={() => cyInstance && cyInstance.animate({ fit: { eles: cyInstance.elements(), padding: 60 }, duration: 300 })}
              bookmarksCount={bookmarksCount}
            />
          </Col>
                
        </Row>
      </Container>
      </div>
    </CyContext.Provider>
  );
}

export default GraphPage;
