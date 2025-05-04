// components/NodeDetail.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Badge } from "react-bootstrap";
import { Link } from "react-router-dom"; 

function NodeDetail() {
  const { id } = useParams(); // because you are navigating based on ID
  const [nodeData, setNodeData] = useState(null);
  const [relations, setRelations] = useState([]);

  useEffect(() => {
    const fetchNodeAndRelations = async () => {
    const nodeRes = await fetch(`${process.env.REACT_APP_API_URL}/nodes/${encodeURIComponent(id)}`);
    const relRes = await fetch(`${process.env.REACT_APP_API_URL}/relationships/?from_id=${encodeURIComponent(id)}`);
    console.log(`ID is ${id}`)        
    const nodeJson = await nodeRes.json();
    const relJson = await relRes.json();

    setNodeData(nodeJson); // because the backend now returns flat node
    setRelations(relJson.relationships || []);
    };
    fetchNodeAndRelations();
  }, [id]);
  

  if (!nodeData) return <p>Loading...</p>;

  return (
    <div style={{ padding: "1rem" }}>
        <Card className="mb-3">
            <Card.Header><h4>{nodeData.name}</h4></Card.Header>
            <Card.Body>
                <p><strong>Type:</strong> {nodeData.type}</p>
                <p><strong>Summary:</strong> {nodeData.summary}</p>
            </Card.Body>
        </Card>
        <Card>
            <Card.Header><h5>Connections</h5></Card.Header>
                <Card.Body>
                    <ul>
                    {relations.map((rel, idx) => {
                        const type = rel.type || "RELATED";
                        const target = rel.target || "Unknown";
                        return (
                            <li key={idx}>
                            <Badge bg="info" className="me-2">{type}</Badge>
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
  );
}

export default NodeDetail;
