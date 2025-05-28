import React, { useEffect, useRef, useState } from "react";
import { Container, Row, Col, Image } from "react-bootstrap";
import GraphView from "./GraphView";
import Legend from "./LegendToggle";
import { CyContext } from "./context/CyContext";
import { Box, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import { useDarkMode } from './context/DarkModeContext';

function GraphPage() {

  const [graphName, setGraphName] = useState("HE_2025");
  const graphDataRef = useRef(null);
  const rawGraphDataRef = useRef(null);
  const [cyInstance, setCyInstance] = useState(null); 
  const [ready, setReady] = useState(false);
  const hoveredNodeRef = useRef(null);
  const hoveredNodeIdRef = useRef(null);
  const { darkMode, setDarkMode } = useDarkMode();
  const API_BASE = process.env.REACT_APP_API_URL;

  const fetchGraph = async () => {
    try {
      const baseName = graphName.replace('_cose', ''); // 👈 normalize here

      let nodesUrl, relsUrl;
      let rawNodes = [];

      if (baseName === "HE_2025") {
        nodesUrl = `${API_BASE}/nodes/`;
        relsUrl = `${API_BASE}/relationships/`;
        const rawRes = await fetch(`${API_BASE}/nodes/raw_nodes/`);
        const rawJson = await rawRes.json();
        rawNodes = rawJson?.nodes || [];
      } else if (baseName === "Cluster_4") {
        nodesUrl = `${API_BASE}/cluster4/nodes`;
        relsUrl = `${API_BASE}/cluster4/relationships`;
      } else if (baseName === "Cluster_2") {
        nodesUrl = `${API_BASE}/cluster2/nodes`;
        relsUrl = `${API_BASE}/cluster2/relationships`;
      }

      const [nodesRes, relsRes] = await Promise.all([
        fetch(nodesUrl),
        fetch(relsUrl)
      ]);

      const nodes = await nodesRes.json();
      const rels = await relsRes.json();

      graphDataRef.current = { nodes, rels };
      rawGraphDataRef.current = { nodes: { nodes: rawNodes } };

      setReady(true);
    } catch (e) {
      console.error("Failed to preload graph data", e);
    }
  };

  useEffect(() => {
    graphDataRef.current = null;
    rawGraphDataRef.current = null;
    setReady(false);  // ✅ ensure reset before fetch
    fetchGraph();
  }, [graphName]);

  return (
    <CyContext.Provider value={cyInstance}>
      <Container
        fluid
        className={`vh-100 d-flex flex-column p-0 overflow-hidden graph-container`}
      >
        {/* Main content */}
        <Row
          className="flex-grow-1 w-100 g-0"
          style={{ flexWrap: "nowrap" }}
        >

          {/* Left Sidebar: Legend (fixed 400px) */}
          <Col
            xs="auto"
            className="p-0"
            style={{ width: 400, maxWidth: 400, flex: "0 0 400px" }}
          >
            {cyInstance ? (
              <Legend hoveredNodeRef={hoveredNodeRef} graphName={graphName} setGraphName={setGraphName} />
            ) : (
              <div>Loading legend...</div>
            )}
          </Col>

          {/* Center: GraphView */}
          <Col className="d-flex flex-column p-0 overflow-hidden">
            {ready ? (
              <GraphView
                graphData={graphDataRef.current}
                rawGraphData={rawGraphDataRef.current}
                onCyReady={(cy) => setCyInstance(cy)}
                onNodeHover={(node) => {
                  hoveredNodeRef.current = node;
                }}
                hoveredNodeIdRef={hoveredNodeIdRef}
                onHoverNodeIdChange={(id) => { hoveredNodeIdRef.current = id; }}
                graphName={graphName}
              />
            ) : (
              <div className="text-center p-5">Loading graph...</div>
            )}
          </Col>

          {/* Right Sidebar: Icon Panel (fixed 60px) */}
          <Col
            xs="auto"
            className="p-0 legend-sidebar"
            style={{
              width: 60,
              maxWidth: 60,
              flex: "0 0 60px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
              zIndex: 10
            }}
          >
            <div className="flex justify-items-center">
              <IconButton className="icon-button" size="large"><InfoOutlinedIcon fontSize="large" /></IconButton>
              <IconButton
                className="icon-button"
                size="large"
                onClick={() => setDarkMode(prev => !prev)}
              >
                <Brightness4Icon  fontSize="large"/>
              </IconButton>

              <IconButton className="icon-button" size="large"><BarChartIcon fontSize="large" /></IconButton>
              <IconButton className="icon-button" size="large"><SettingsIcon fontSize="large" /></IconButton>
            </div>
          </Col>
        </Row>
      </Container>
    </CyContext.Provider>          
  );
}

export default GraphPage;
