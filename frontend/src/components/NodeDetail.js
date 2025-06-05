// components/NodeDetail.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Badge, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import GraphHeader from "./GraphHeader";
import { useDarkMode } from "./context/DarkModeContext";

function CollapsibleList({ label, items }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>{label}:</strong>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => setOpen(prev => !prev)}
        >
          {open ? "Hide" : "Show"}
        </Button>
      </div>
      {open && (
        <ul style={{ marginTop: "0.5rem" }}>
          {items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NodeDetail() {
  const { id } = useParams();
  const [nodeData, setNodeData] = useState(null);
  const [relations, setRelations] = useState([]);
   const { darkMode } = useDarkMode();
  useEffect(() => {
    const fetchNodeAndRelations = async () => { 
    let relEndpoint;
    let nodeEndpoint;
    if (id.startsWith("cluster2_call_")) {
      nodeEndpoint = `${process.env.REACT_APP_API_URL}/cluster2/node/${encodeURIComponent(id)}`;
      relEndpoint = `${process.env.REACT_APP_API_URL}/cluster2/relationships?from_id=${encodeURIComponent(id)}`;
    } else if (id.startsWith("cluster4_call_") || id.startsWith("cluster4_theme_") || id.startsWith("cluster4_destination_")) {
      nodeEndpoint = `${process.env.REACT_APP_API_URL}/cluster4/node/${encodeURIComponent(id)}`;
      relEndpoint = `${process.env.REACT_APP_API_URL}/cluster4/relationships?from_id=${encodeURIComponent(id)}`;
    } else {
      nodeEndpoint = `${process.env.REACT_APP_API_URL}/nodes/${encodeURIComponent(id)}`;
      relEndpoint = `${process.env.REACT_APP_API_URL}/relationships/?from_id=${encodeURIComponent(id)}`;
    }

    const [nodeRes, relRes] = await Promise.all([
      fetch(nodeEndpoint),
      fetch(relEndpoint)
    ]);

    const nodeJson = await nodeRes.json();
    const relJson = await relRes.json();

    setNodeData(nodeJson);
    console.log(nodeEndpoint)
    console.log(id)
    setRelations(relJson.relationships || []);
  };

    fetchNodeAndRelations();
  }, [id]);
 
  if (!nodeData) return <p>Loading...</p>;

  const displayableKeys = Object.keys(nodeData).filter(
    key => key !== "id" && key !== "name" && key !== "type" && nodeData[key]
  );

  return (
    <>
      <GraphHeader />
        <div className={darkMode ? "dark-theme" : "light-theme"}>
        <Card className="mb-3">
          <Card.Header><h4>{nodeData.name}</h4></Card.Header>
          <Card.Body>
          {displayableKeys.map(key => {
          const value = nodeData[key];
          const isBulletList = typeof value === "string" && value.includes("•");
          const items = isBulletList
            ? value
                .split("•")
                .map(str => str.trim())
                .filter(Boolean)
            : null;

          return (
            <div key={key} style={{ marginBottom: "1rem" }}>
              {items ? (
                <CollapsibleList label={formatLabel(key)} items={items} />
              ) : (
                <p><strong>{formatLabel(key)}:</strong> {value}</p>
              )}
            </div>
          );
        })}

          </Card.Body>
        </Card>
        <Card>
          <Card.Header><h5>Connections</h5></Card.Header>
          <Card.Body>
           <ul>
            {relations.map((rel, idx) => {
              const relationType = rel.relation || rel.type || "RELATED";
              const target = rel.target || "Unknown";

              return (
                <li key={idx}>
                  <Badge bg="info" className="me-2">{relationType}</Badge>
                  <Link to={`/node/${encodeURIComponent(target)}`}>
                    {target}
                  </Link>
                </li>
              );
            })}
          </ul>
          </Card.Body>
        </Card>
      </div>
    </>
  );
}

function formatLabel(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default NodeDetail;
