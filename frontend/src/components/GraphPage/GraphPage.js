// src/components/GraphPage/GraphPage.js
import { useRef, useState, useEffect, useCallback } from "react";
import { Container, Row, Col } from "react-bootstrap";
import GraphView from "../GraphView";
import { CyContext } from "../context/CyContext";
import CircularProgress from "@mui/material/CircularProgress";
import { useLayoutOptions } from "./useLayoutOptions";
import { useDarkMode } from "../context/DarkModeContext";
import "../../styles/main.scss"; 
import { useGraphData } from "./useGraphData";
import SidebarControls from "./SidebarControls";
import LegendToggle from "../LegendToggle";
import {IconButton,Box } from "@mui/material";
import ArrowCircleRightIcon from '@mui/icons-material/ArrowCircleRight';
import ChatBot from "../ChatBot/ChatBot";

function GraphPage() {
  const {
    graphName,
    setGraphName,
    graphDataRef, 
    ready
  } = useGraphData();

  const [cyInstance, setCyInstance] = useState(null);
  const hoveredNodeRef = useRef(null);
  const hoveredNodeIdRef = useRef(null);
  const graphRef = useRef();
  const { darkMode, setDarkMode } = useDarkMode();
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);
  const [isMessageDrawerOpen, setIsMessageDrawerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { layoutOptions, setLayoutOptions, updateOption } = useLayoutOptions();
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [showChatbot, setShowChatbot] = useState(true);  // default: visible

  const handleApplyLayout = () => {
    if (graphRef.current) {
      graphRef.current.rerunLayout();
    }
  };

  const handleNodeHover = useCallback((node) => {
    hoveredNodeRef.current = node;
  }, []);

  const handleHoverNodeIdChange = useCallback((id) => {
    hoveredNodeIdRef.current = id;
  }, []);

  useEffect(() => {
    if (!cyInstance || cyInstance.destroyed()) return;

    const targetZoom = isLegendCollapsed ? 0.9 : 0.7;
    cyInstance.animate({
      zoom: targetZoom,
      center: { eles: cyInstance.nodes() },
      duration: 300
    });
  }, [isLegendCollapsed, cyInstance]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("bookmarkedCalls") || "[]");
    setBookmarksCount(stored.length);
  }, []);


{showChatbot ? (
  <Box
    sx={{
      position: 'absolute',
      bottom: 20,
      right: 20,
      width: 360,
      maxHeight: 480,
      zIndex: 1000,
    }}
  >
    <ChatBot onClose={() => setShowChatbot(false)} />
  </Box>
) : (
  <IconButton
    onClick={() => setShowChatbot(true)}
    sx={{
      position: 'absolute',
      bottom: 20,
      right: 20,
      zIndex: 1000,
      bgcolor: 'white',
      boxShadow: 3,
      '&:hover': { bgcolor: '#f0f0f0' },
    }}
  >
    💬
  </IconButton>
)}


  return (
    <CyContext.Provider value={cyInstance}>
      <Container fluid className="vh-100 d-flex flex-column p-0 overflow-hidden graph-container">
        <Row className="flex-grow-1 w-100 g-0 legend-titles" style={{ flexWrap: "nowrap" }}>
         <Col
            xs="auto"
            className="p-0 sidebar-transition"
            style={{
              width: isLegendCollapsed ? 60 : 400,
              backgroundColor: darkMode ? 'rgb(20, 43, 59)' : 'rgb(233, 233, 233)',
              position: 'relative',
            }}
          >
            {isLegendCollapsed ? (
              <div className="d-flex flex-column align-items-center justify-content-start pt-2 .legend-sidebar">
                <IconButton
                  onClick={() => setIsLegendCollapsed(false)}
                  size="large"
                  title="Expand Legend"
                >
                  <ArrowCircleRightIcon style={{ color: 'white' }} fontSize="large" />
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
            {showChatbot && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 20,
                  right: 20,
                  zIndex: 1000,
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 20,
                    right: 20,
                    width: 360,
                    maxHeight: 480,
                    zIndex: 1000,
                  }}
                >
                  <ChatBot />
                </Box>
              </Box>
            )}
            {ready ? (
              <GraphView
                layoutOptions={layoutOptions}
                graphref={graphRef}
                graphData={graphDataRef.current}
                onCyReady={setCyInstance}
                onNodeHover={handleNodeHover}
                hoveredNodeIdRef={hoveredNodeIdRef}
                onHoverNodeIdChange={handleHoverNodeIdChange}
                graphName={graphName}
              />
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100">
                <CircularProgress color="primary" />
              </div>
            )}
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
              layoutOptions={layoutOptions}
              updateOption={updateOption}
              handleApplyLayout={handleApplyLayout}
              bookmarksCount={bookmarksCount}
            />
          </Col>
        </Row>
      </Container>
    </CyContext.Provider>
  );
}

export default GraphPage;
