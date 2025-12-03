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
import { IconButton, Box } from "@mui/material";
import ArrowCircleRightIcon from "@mui/icons-material/ArrowCircleRight";
import ChatBot from "../ChatBot/ChatBot";
import { layoutConfig } from "../utils/layoutConfig";

function GraphPage() {
  const { ready, graphName, setGraphName, loadFromStore } = useGraphData();
  const [cyInstance, setCyInstance] = useState(null);
  const hoveredNodeRef = useRef(null);
  const { darkMode, setDarkMode } = useDarkMode();
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);
  const [isMessageDrawerOpen, setIsMessageDrawerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { layoutOptions: userLayout, updateOption } = useLayoutOptions();
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [showChatbot, setShowChatbot] = useState(true);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("bookmarkedCalls") || "[]");
    setBookmarksCount(stored.length);
  }, []);

  // merge presets (DEFAULT for ROOT/clusters; HE_2025 for SP) with user overrides
  const base = graphName === "HE_2025" ? layoutConfig.HE_2025 : layoutConfig.DEFAULT;
  const effectiveLayout = { ...base, ...userLayout, name: userLayout?.name || base?.name || "cose-bilkent" };

  // smooth zoom when legend collapses/expands
  useEffect(() => {
    if (!cyInstance || cyInstance.destroyed()) return;
    const targetZoom = isLegendCollapsed ? 0.9 : 0.7;
    cyInstance.animate({ zoom: targetZoom, center: { eles: cyInstance.nodes() }, duration: 300 });
  }, [isLegendCollapsed, cyInstance]);

  if (!ready) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100">
        <CircularProgress color="primary" />
      </div>
    );
  }

  return (
    <CyContext.Provider value={cyInstance}>
      <Container fluid className="vh-100 d-flex flex-column p-0 overflow-hidden graph-container">
        <Row className="flex-grow-1 w-100 g-0 legend-titles" style={{ flexWrap: "nowrap" }}>
          {/* LEFT SIDEBAR */}
          <Col
            xs="auto"
            className="p-0 sidebar-transition"
            style={{
              width: isLegendCollapsed ? 60 : 400,
              backgroundColor: darkMode ? "rgb(20, 43, 59)" : "rgb(233, 233, 233)",
              position: "relative",
            }}
          >
            {isLegendCollapsed ? (
              <div className="d-flex flex-column align-items-center justify-content-start pt-2">
                <IconButton onClick={() => setIsLegendCollapsed(false)} size="large" title="Expand Legend">
                  <ArrowCircleRightIcon style={{ color: "white" }} fontSize="large" />
                </IconButton>
              </div>
            ) : (
              <LegendToggle
                hoveredNodeRef={hoveredNodeRef}
                graphName={graphName}
                setGraphName={setGraphName}
                onCollapse={() => setIsLegendCollapsed(true)}
              />
            )}
          </Col>

          {/* MAIN GRAPH PANEL */}
          <Col className="d-flex flex-column p-0 overflow-hidden">
            {/* Chatbot bottom-right with toggle button */}
            {showChatbot ? (
              <Box sx={{ position: "absolute", bottom: 20, right: 20, width: 360, maxHeight: 480, zIndex: 1000 }}>
                <ChatBot onClose={() => setShowChatbot(false)} />
              </Box>
            ) : (
              <IconButton
                onClick={() => setShowChatbot(true)}
                sx={{
                  position: "absolute",
                  bottom: 20,
                  right: 20,
                  zIndex: 1000,
                  bgcolor: "white",
                  boxShadow: 3,
                  "&:hover": { bgcolor: "#f0f0f0" },
                }}
                title="Open chat"
              >
                💬
              </IconButton>
            )}

            <NestedGraphController
              initialGraphName="ROOT"
              layoutOptions={effectiveLayout}
              loadFromStore={loadFromStore}
              onCyReady={(cy) => setCyInstance(cy)}
              onNodeHover={(node) => {
                hoveredNodeRef.current = node || null;
              }}
              onHoverNodeIdChange={() => {}}
              onLevelChange={(key) => setGraphName(key)}   // keep filter synced
              targetGraphName={graphName}                  // react when filter changes
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
    </CyContext.Provider>
  );
}

export default GraphPage;
