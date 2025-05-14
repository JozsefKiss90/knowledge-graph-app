import React, { useEffect, useRef, useState } from "react";
import { Container, Row, Col, Image } from "react-bootstrap";
import GraphView from "./GraphView";
import Legend from "./LegendToggle";
import { CyContext } from "./context/CyContext";
import GraphHeader from './GraphHeader';

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
      const nodesUrl = graphName === "HE_2025"
        ? `${API_BASE}/nodes/`
        : `${API_BASE}/cluster4/nodes`;
      const relsUrl = graphName === "HE_2025"
        ? `${API_BASE}/relationships/`
        : `${API_BASE}/cluster4/relationships`;
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
        {/* Header */}
        <GraphHeader />

        {/* Main content */}
        <Row
          className="flex-grow-1 w-100"
          style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap" }}
        >
        {ready && cyInstance ? 
        <>
        <Col md="auto" className="p-3">
          <select
            value={graphName}
            onChange={(e) => {
              setReady(false);
              setGraphName(e.target.value);
            }}
            style={{ padding: "6px", fontSize: "14px", borderRadius: "4px" }}
          >
            <option value="HE_2025">HE 2025</option>
            <option value="Cluster_4">Cluster 4</option>
          </select>
        </Col>
        <Legend hoveredNodeRef={hoveredNodeRef} graphName={graphName} /> 
        </>
        : <div>Loading legend...</div>}

          {/* Graph area */}
          <Col
            md={6}
            className="d-flex flex-column overflow-hidden p-0 w-100"
          >
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
        </Row>
      </Container>
    </CyContext.Provider>          
  );
}

export default GraphPage;
