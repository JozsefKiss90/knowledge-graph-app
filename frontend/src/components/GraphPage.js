import React, { useEffect, useRef, useState } from "react";
import { Container, Row, Col, Image } from "react-bootstrap";
import GraphView from "./GraphView";
import Legend from "./LegendToggle";
import { CyContext } from "./context/CyContext";
import GraphHeader from './GraphHeader';

function GraphPage() {
  const graphDataRef = useRef(null);
  const rawGraphDataRef = useRef(null);
  const [cyInstance, setCyInstance] = useState(null);
  const [ready, setReady] = useState(false);
  const hoveredNodeRef = useRef(null);
  const hoveredNodeIdRef = useRef(null);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const [nodesRes, relsRes, rawNodesRes] = await Promise.all([
          fetch("http://localhost:8000/nodes/"),
          fetch("http://localhost:8000/relationships/"),
          fetch("http://localhost:8000/nodes/raw_nodes/")
        ]);
        
        const nodes = await nodesRes.json();
        const rels = await relsRes.json();
        const rawNodes = await rawNodesRes.json();
        
        graphDataRef.current = { nodes, rels };
        rawGraphDataRef.current = { nodes: rawNodes };
        
        setReady(true);
      } catch (e) {
        console.error("Failed to preload graph data", e);
      }
    };

    fetchGraph();
  }, []);

  return (
    <CyContext.Provider value={cyInstance}>
      <Container fluid className="vh-100 d-flex flex-column p-0">
        {/* Header */}
        <GraphHeader />

        {/* Main content */}
        <Row
          className="flex-grow-1 h-100"
          style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap" }}
        >
        {ready && cyInstance ? <Legend hoveredNodeRef={hoveredNodeRef} /> : <div>Loading legend...</div>}

          {/* Graph area */}
          <Col
            md={9}
            className="d-flex flex-column overflow-hidden p-0"
            
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
