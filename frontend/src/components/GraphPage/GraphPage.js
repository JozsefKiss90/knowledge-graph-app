// GraphPage.js
import { useRef, useState, useEffect, useCallback } from "react";
import { Container, Row, Col } from "react-bootstrap";
import NestedGraphController from "../NestedGraphController";
import { CyContext } from "../context/CyContext";
import CircularProgress from "@mui/material/CircularProgress";
import { useLayoutOptions } from "./useLayoutOptions";
import { useDarkMode } from "../context/DarkModeContext";
import { useGraphData } from "./useGraphData";
import SidebarControls from "./SidebarControls";
import LegendToggle from "../LegendToggle";
import { buildElements } from "../utils/buildElements";
import ChatBot from "../ChatBot/ChatBot";
import { layoutConfig } from "../utils/layoutConfig";
import GraphStatusBar from "./GraphStatusBar";
import GraphTopBar from "./GraphTopBar";
import { IconButton } from "@mui/material";
import HoveredNodeInfo from "./HoveredNodeInfo/HoveredNodeInfo";
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
  const callDetailCacheRef = useRef(new Map()); // callId -> detail JSON

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

  const cleanKey = (k) => String(k || "").replace("_cose", "");

  const getLayerKey = () =>
    cleanKey(
      (cyInstance && !cyInstance.destroyed?.()
        ? cyInstance.scratch?.("layerKey")
        : null) || graphName
    );

  // IMPORTANT: on DEST_* layers, the dataset identity is stored in cy.scratch("graphName")
  const getDatasetKey = () =>
    cleanKey(
      (cyInstance && !cyInstance.destroyed?.()
        ? cyInstance.scratch?.("graphName")
        : null) || graphName
    );

  const getNodeId = (n) => String(n?.id ?? n?.data?.id ?? "");
  const getNodeTypeLower = (n) =>
    String(n?.type ?? n?.category ?? n?.data?.type ?? n?.data?.category ?? "").toLowerCase();

  const countDestinationsInClusterRaw = (clusterRaw) => {
    try {
      const full = buildElements(clusterRaw);
      const nodes = full?.nodeElements || [];
      return nodes.filter((el) => {
        const d = el?.data || {};
        const t = String(d.type || d.category || "").toLowerCase();
        return t.includes("destination");
      }).length;
    } catch {
      return null;
    }
  };

  const computeCallIdsForDestination = (clusterRaw, destinationId) => {
    try {
      const full = buildElements(clusterRaw);
      const nodes = full?.nodeElements || [];
      const edges = full?.edgeElements || [];

      const typeById = new Map(
        nodes.map((el) => {
          const d = el?.data || {};
          return [String(d.id || ""), String(d.type || d.category || "").toLowerCase()];
        })
      );

      const destId = String(destinationId);
      const callIds = new Set();

      edges.forEach((el) => {
        const d = el?.data || {};
        const et = String(d.type || d.category || d.label || "").toUpperCase();

        // robust match (covers HAS_CALL, has_call, etc.)
        if (!et.includes("HAS_CALL")) return;

        const s = String(d.source ?? "");
        const t = String(d.target ?? "");
        if (!s || !t) return;

        if (s !== destId && t !== destId) return;

        const other = s === destId ? t : s;
        const otherType = typeById.get(other) || "";

        // if we can identify the other endpoint as a Call, require it; otherwise accept
        if (otherType && !otherType.includes("call")) return;

        callIds.add(other);
      });

      return callIds;
    } catch {
      return null;
    }
  };

  const hydrateHoveredNode = async (node) => {
    if (!node) {
      setHoveredNode(null);
      return;
    }

    const nodeId = getNodeId(node);
    if (!nodeId) {
      setHoveredNode(node);
      return;
    }

    // Always show the basic node immediately
    setHoveredNode(node);

    const typeLower = getNodeTypeLower(node);
    const isCall = typeLower.includes("call");
    const isDestination = typeLower.includes("destination");
    const isCluster = typeLower.includes("cluster") || typeLower === "root";

    const layerKey = getLayerKey();
    const datasetKey = getDatasetKey();

    // ---- CLUSTER cards (ROOT + Cluster_* layers) => show size of the graph opened by that node ----
    if (isCluster) {
      // On ROOT: nodeId is the cluster key (Cluster_1..6)
      // On Cluster_*: the cluster root node id is also the cluster key
      const clusterKey = cleanKey(nodeId);
      const raw = loadFromStore?.(clusterKey);

      const destCount = raw ? countDestinationsInClusterRaw(raw) : null;

      if (!cancelled && nodeId === lastHoveredId && typeof destCount === "number") {
        // node_count = visible nodes in the opened graph:
        //  - cluster root + destinations
        setHoveredNode((prev) => ({
          ...(prev || node),
          destination_count: destCount,
          node_count: destCount + 1,
        }));
      }
      return;
    }

    // ---- DESTINATION cards on Cluster_* layer => compute calls from the CLUSTER dataset in store ----
    if (isDestination) {
      // Only cluster datasets have the HAS_CALL relationships we need.
      if (datasetKey && datasetKey.toLowerCase().startsWith("cluster_")) {
        const raw = loadFromStore?.(datasetKey);
        const callIds = raw ? computeCallIdsForDestination(raw, nodeId) : null;
        const callCount = callIds ? callIds.size : null;

        if (!cancelled && nodeId === lastHoveredId && typeof callCount === "number" && callCount > 0) {
          // node_count = destination root + calls in the opened graph
          setHoveredNode((prev) => ({
            ...(prev || node),
            call_count: callCount,
            node_count: callCount + 1,
          }));
        }
      }
      return;
    }

    // ---- CALL cards (keep your existing remote hydration) ----
    if (!isCall) return;

    const cached = callDetailCacheRef.current.get(nodeId);
    if (cached) {
      if (!cancelled && nodeId === lastHoveredId) {
        setHoveredNode({ ...node, ...cached });
      }
      return;
    }

    try {
      const config = getClusterConfigForId(nodeId);
      if (!config) return;

      const endpoint = config.buildNodeEndpoint(nodeId);
      const res = await fetch(endpoint);
      if (!res.ok) {
        console.error("Failed to hydrate hovered Call node:", nodeId, res.status);
        return;
      }

      const detail = await res.json();

      if (!cancelled && nodeId === lastHoveredId) {
        setHoveredNode({ ...node, ...detail });
      }
    } catch (err) {
      console.error("Error hydrating hovered Call node:", err);
    }
  };

  const interval = setInterval(() => {
    const current = hoveredNodeRef.current;

    const currentId = getNodeId(current);
    if (!currentId) {
      if (lastHoveredId !== null) {
        lastHoveredId = null;
        setHoveredNode(null);
      }
      return;
    }

    if (currentId !== lastHoveredId) {
      lastHoveredId = currentId;
      hydrateHoveredNode(current);
    }
  }, 120);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}, [hoveredNodeRef, cyInstance, graphName, loadFromStore]);


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
      className="flex-grow-1 d-flex flex-column p-0 graph-container" 
      style={{ flexWrap: "nowrap", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}
    >        
      <Row className="flex-grow-1 w-100 g-0" style={{ flexWrap: "nowrap", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
          {/* LEFT SIDEBAR */}
          <Col
            xs="auto"
            className="p-0 sidebar-transition"
            style={{
              width: isLegendCollapsed ? 60 : 360,
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
          <Col className="d-flex flex-column p-0" style={{ minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
            <NestedGraphController
              initialGraphName="ROOT"
              layoutOptions={effectiveLayout}
              loadFromStore={loadFromStore}
              onGraphStats={setGraphStats}
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
                  graphName={graphName}
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
