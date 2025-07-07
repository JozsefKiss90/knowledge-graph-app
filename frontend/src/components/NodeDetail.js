import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, Badge, Button, Row, Col, Spinner } from "react-bootstrap";
import GraphHeader from "./GraphHeader";
import { useDarkMode } from "./context/DarkModeContext";
import '../styles/nodedetails.scss';
import { useNodeDetail } from "./NodeDetalParts/useNodeDetail";
import NodeConnections from "./NodeDetalParts/NodeConnections";

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
  const { darkMode } = useDarkMode();
  const { id, nodeData, relations, loading } = useNodeDetail();
 
  if (loading || !nodeData) return <div className="loading-spinner"><Spinner animation="border" role="status"><span className="visually-hidden">Loading...</span></Spinner></div>;

  const displayableKeys = Object.keys(nodeData).filter(
    (key) =>
    !["id", "name", "type", "call_type", "opening_date", "deadline"].includes(key) &&
    nodeData[key]
  );

  return (
    <>
      <GraphHeader />
      <div className={`node-detail ${darkMode ? "dark-theme" : "light-theme"}`}>
        <Row>
          <Col md={8} className="info-column">
            <Card className="node-card">
              <Card.Header>
                <h4
                  style={{
                    color:
                      nodeData.opening_date && new Date(nodeData.opening_date) <= new Date()
                        ? "#00ff62"
                        : "red",
                  }}
                >
                  {nodeData.name}
                </h4>
              </Card.Header>

              <Card.Body>
                {nodeData.opening_date && (
                  <div className="node-meta-item">
                    <p>
                      <strong>Opening Date:</strong>{" "}
                      <span
                        style={{
                          color:
                            new Date(nodeData.opening_date) <= new Date() ? "#00ff62" : "red",
                        }}
                      >
                        {nodeData.opening_date}
                      </span>
                    </p>
                  </div>
                )}
                {nodeData.deadline && (
                  <div className="node-meta-item">
                    <p>
                      <strong>Deadline:</strong> {nodeData.deadline}
                    </p>
                  </div>
                )}
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
                   {(id.startsWith("cluster2_call_") || id.startsWith("cluster4_call_")) && (
                  <div className="node-meta-item">
                    <Button
                      variant="primary"
                      style={{ fontWeight: "bold" }}
                      onClick={() => {
                        const stored = JSON.parse(localStorage.getItem("bookmarkedCalls") || "[]");
                        const exists = stored.find(item => item.id === nodeData.id);
                        if (!exists) {
                          stored.push({ id: nodeData.id, name: nodeData.name });
                          localStorage.setItem("bookmarkedCalls", JSON.stringify(stored));
                          alert("Call bookmarked!");
                        } else {
                          alert("Already bookmarked.");
                        }
                      }}
                    >
                      📌 Bookmark this Call
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col md={4} className="connections-column">
            <NodeConnections id={id} relations={relations} />
          </Col>
        </Row>
      </div>
    </>
  );
}

export default NodeDetail;
