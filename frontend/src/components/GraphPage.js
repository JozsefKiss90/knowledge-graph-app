import React, { useEffect, useRef, useState } from "react";
import { Container, Row, Col, Image } from "react-bootstrap";
import GraphView from "./GraphView";
import Legend from "./LegendToggle";
import { CyContext } from "./context/CyContext";
import GraphHeader from './GraphHeader';
import { Box, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';

function GraphPage() {

  const [graphName, setGraphName] = useState("HE_2025");
  const graphDataRef = useRef(null);
  const rawGraphDataRef = useRef(null);
  const [cyInstance, setCyInstance] = useState(null); 
  const [ready, setReady] = useState(false);
  const hoveredNodeRef = useRef(null);
  const hoveredNodeIdRef = useRef(null);

  const API_BASE = process.env.REACT_APP_API_URL;

  const fetchGraph = async () => {
    try {
      let nodesUrl, relsUrl;
      if (graphName === "HE_2025") {
        nodesUrl = `${API_BASE}/nodes/`;
        relsUrl = `${API_BASE}/relationships/`;
      } else if (graphName === "Cluster_4") {
        nodesUrl = `${API_BASE}/cluster4/nodes`;
        relsUrl = `${API_BASE}/cluster4/relationships`;
      } else if (graphName === "Cluster_2") {
        nodesUrl = `${API_BASE}/cluster2/nodes`;
        relsUrl = `${API_BASE}/cluster2/relationships`;
      }
      const rawNodesUrl = `${API_BASE}/nodes/raw_nodes/`;

      const [nodesRes, relsRes, rawNodesRes] = await Promise.all([
        fetch(nodesUrl),
        fetch(relsUrl),
        fetch(rawNodesUrl)
      ]);

      const nodes = await nodesRes.json();
      const rels = await relsRes.json();
      const rawNodes = await rawNodesRes.json();
      console.log(nodes)
      console.log(rels)
      graphDataRef.current = { nodes, rels };
      rawGraphDataRef.current = { nodes: rawNodes };

      setReady(true);
    } catch (e) {
      console.error("Failed to preload graph data", e);
    }
  }

  useEffect(() => {
    fetchGraph();
  }, [graphName]);


  return (
    <CyContext.Provider value={cyInstance}>
      <Container fluid className="vh-100 d-flex flex-column p-0 overflow-hidden"
        style={{ backgroundColor: "rgba(64, 64, 64, 1)"}}>
        {/* Header 
        <GraphHeader />
        */}

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
              />
            ) : (
              <div className="text-center p-5">Loading graph...</div>
            )}
          </Col>

          {/* Right Sidebar: Icon Panel (fixed 60px) */}
          <Col
            xs="auto"
            className="p-0 components"
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
            <div>
              <IconButton style={{color:"white", marginTop:"10px"}} size="large"><InfoOutlinedIcon fontSize="large" /></IconButton>
              <IconButton style={{color:"white", marginTop:"10px"}} size="large"><Brightness4Icon fontSize="large" /></IconButton>
              <IconButton style={{color:"white", marginTop:"10px"}} size="large"><BarChartIcon fontSize="large" /></IconButton>
              <IconButton style={{color:"white", marginTop:"10px"}} size="large"><SettingsIcon fontSize="large" /></IconButton>
            </div>
          </Col>
        </Row>
      </Container>
    </CyContext.Provider>          
  );
}

export default GraphPage;
