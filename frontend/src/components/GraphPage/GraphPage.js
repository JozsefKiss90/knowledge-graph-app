// src/components/GraphPage/GraphPage.js
import { useRef, useState, useEffect } from "react";
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

function GraphPage() {
  const {
    graphName,
    setGraphName,
    graphDataRef,
    rawGraphDataRef,
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

  const handleApplyLayout = () => {
    if (graphRef.current) {
      graphRef.current.rerunLayout();
    }
  };

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


  return (
    <CyContext.Provider value={cyInstance}>
      <Container fluid className="vh-100 d-flex flex-column p-0 overflow-hidden graph-container">
        <Row className="flex-grow-1 w-100 g-0 legend-titles" style={{ flexWrap: "nowrap" }}>
          {/* LEFT LEGEND SIDEBAR */}
          <LegendToggle
            isCollapsed={isLegendCollapsed}
            onExpand={() => setIsLegendCollapsed(false)}
            onCollapse={() => setIsLegendCollapsed(true)}
            graphName={graphName}
            setGraphName={setGraphName}
            hoveredNodeRef={hoveredNodeRef}
            darkMode={darkMode}
          />
          {/* MAIN GRAPH PANEL */}
          <Col className="d-flex flex-column p-0 overflow-hidden">
            {ready ? (
              <GraphView
                layoutOptions={layoutOptions}
                graphref={graphRef}
                graphData={graphDataRef.current}
                rawGraphData={rawGraphDataRef.current}
                onCyReady={setCyInstance}
                onNodeHover={(node) => (hoveredNodeRef.current = node)}
                hoveredNodeIdRef={hoveredNodeIdRef}
                onHoverNodeIdChange={(id) => (hoveredNodeIdRef.current = id)}
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
