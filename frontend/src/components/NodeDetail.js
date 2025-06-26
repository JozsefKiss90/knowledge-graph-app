import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, Badge, Button, Row, Col, Spinner } from "react-bootstrap";
import GraphHeader from "./GraphHeader";
import { useDarkMode } from "./context/DarkModeContext";
import '../styles/nodedetails.scss';

const labelMap = {
  funding_link: "Funding Link",
  expected_eu_contribution: "Expected EU Contribution",
  indicative_budget: "Total Budget",
  max_funded_projects: "Max Funded Projects",
  deadline: "Deadline",
  trl: "Technology Readiness Level",
  source: "Source",
  call_id: "Call ID",
  scope: "Scope",
};

function CollapsibleList({ label, items }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="collapsible-list">
      <div className="collapsible-header">
        <strong>{label}:</strong>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => setOpen((prev) => !prev)}
          className="toggle-btn"
        >
          {open ? "▲ Hide" : "▼ Show"}
        </Button>
      </div>
      {open && (
        <ul className="collapsible-items">
          {items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function getGraphNameFromId(id) {
  if (id.startsWith("cluster2_")) return "Cluster_2";
  if (id.startsWith("cluster4_")) return "Cluster_4";
  return "HE_2025";
}

function formatLabel(key) {
  return labelMap[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(key, value) {
  if (key === "source") {
    return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  return value;
}

function NodeDetail() {
  const { id } = useParams();
  const [nodeData, setNodeData] = useState(null);
  const [relations, setRelations] = useState([]);
  const { darkMode } = useDarkMode();
  console.log(relations)
  useEffect(() => {
    const fetchNodeAndRelations = async () => {
      const prevLayout = localStorage.getItem("graphName")?.endsWith("_cose");
      const graphName = getGraphNameFromId(id);
      const restoredGraphName = prevLayout ? `${graphName}_cose` : graphName;
      localStorage.setItem("graphName", restoredGraphName);

      let nodeEndpoint, relEndpoint;
      if (id.startsWith("cluster2_call_")) {
        nodeEndpoint = `${process.env.REACT_APP_API_URL}/cluster2/node/${encodeURIComponent(id)}`;
        relEndpoint = `${process.env.REACT_APP_API_URL}/cluster2/relationships?from_id=${encodeURIComponent(id)}`;
      } else if (
        id.startsWith("cluster4_call_") ||
        id.startsWith("cluster4_theme_") ||
        id.startsWith("cluster4_destination_")
      ) {
        nodeEndpoint = `${process.env.REACT_APP_API_URL}/cluster4/node/${encodeURIComponent(id)}`;
        relEndpoint = `${process.env.REACT_APP_API_URL}/cluster4/relationships?from_id=${encodeURIComponent(id)}`;
      } else {
        nodeEndpoint = `${process.env.REACT_APP_API_URL}/nodes/${encodeURIComponent(id)}`;
        relEndpoint = `${process.env.REACT_APP_API_URL}/relationships/?from_id=${encodeURIComponent(id)}`;
      }

      const [nodeRes, relRes] = await Promise.all([fetch(nodeEndpoint), fetch(relEndpoint)]);
      const nodeJson = await nodeRes.json();
      const relJson = await relRes.json();
      setNodeData(nodeJson);
      setRelations(relJson.relationships || []);
    };

    fetchNodeAndRelations();
  }, [id]);

  if (!nodeData) return <div className="loading-spinner"><Spinner animation="border" role="status"><span className="visually-hidden">Loading...</span></Spinner></div>;

  const displayableKeys = Object.keys(nodeData).filter(
    (key) => key !== "id" && key !== "name" && key !== "type" && key !== "call_type" && nodeData[key]
  );

  return (
    <>
      <GraphHeader />
      <div className={`node-detail ${darkMode ? "dark-theme" : "light-theme"}`}>
        <Row>
          <Col md={8} className="info-column">
            <Card className="node-card">
              <Card.Header><h4>{nodeData.name}</h4></Card.Header>
              <Card.Body>
                {[
                  "call_id", "funding_link"
                ].map((key) => (
                  nodeData[key] && (
                    <div key={key} className="node-meta-item">
                      {key === "funding_link" ? (
                        <p><strong>{formatLabel(key)}:</strong> <a href={nodeData[key]} target="_blank" rel="noopener noreferrer">Call Link</a></p>
                      ) : (
                        <p><strong>{formatLabel(key)}:</strong> {formatValue(key, nodeData[key])}</p>
                      )}
                    </div>
                  )
                ))}

                {[
                  "expected_outcome", "scope"
                ].map((key) => (
                  nodeData[key] && (
                    <div key={key} className="node-meta-item">
                      <CollapsibleList label={formatLabel(key)} items={nodeData[key].split("•").map(str => str.trim()).filter(Boolean)} />
                    </div>
                  )
                ))}

                {[
                  "indicative_budget", "max_funded_projects"
                ].map((key) => (
                  nodeData[key] && (
                    <div key={key} className="node-meta-item">
                      <p><strong>{formatLabel(key)}:</strong> {formatValue(key, nodeData[key])}</p>
                    </div>
                  )
                ))}

                {displayableKeys.filter(key => ![
                  "call_id", "funding_link", "expected_outcome", "scope", "indicative_budget", "max_funded_projects"
                ].includes(key)).map((key) => (
                  <div key={key} className="node-meta-item">
                    <p><strong>{formatLabel(key)}:</strong> {formatValue(key, nodeData[key])}</p>
                  </div>
                ))}
              </Card.Body>
            </Card>
          </Col>

          <Col md={4} className="connections-column">
            <Card className="connections-card">
              <Card.Header><h5>Connections</h5></Card.Header>
              <Card.Body>
                {relations.length === 0 ? <p>No connections available.</p> : (
                  <ul className="connections-list">
                    {relations.filter((rel) => {
                      const { source, target, relation, type } = rel;
                      const relType = relation || type;
                      if (source !== id) return false;
                      if (id.startsWith("cluster2_call_") && relType !== "BELONGS_TO_DESTINATION") return false;
                      if (id.startsWith("cluster2_destination_") && relType !== "HAS_CALL") return false;
                      return true;
                    }).map((rel, idx) => (
                      <li key={idx} className="connection-item">
                        <Badge bg="info" className="relation-badge">{rel.relation || rel.type || "RELATED"}</Badge>
                        <Link
                          to={`/node/${encodeURIComponent(rel.target)}`}
                          onClick={() => localStorage.setItem("graphName", getGraphNameFromId(rel.target))}
                        >
                          {rel.target}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
}

export default NodeDetail;
