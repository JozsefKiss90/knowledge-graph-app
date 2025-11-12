import { useEffect, useState } from "react";
import { Card, Badge } from "react-bootstrap";
import { Link } from "react-router-dom";

function getGraphNameFromId(id) {
  if (id.startsWith("cluster2_")) return "Cluster_2";
  if (id.startsWith("cluster4_")) return "Cluster_4";
  if (id === "CL3" || id.startsWith("CL3:") || id.startsWith("HORIZON-CL3-")) return "Cluster_3";
  return "HE_2025";
}

const NodeConnections = ({ id, relations }) => {
  const [targetNames, setTargetNames] = useState({});

  useEffect(() => {
    const fetchTargetNames = async () => {
      const promises = relations.map(async (rel) => {
        if (!rel.target || targetNames[rel.target]) return;

        let endpoint = "";
        if (rel.target.startsWith("cluster2_")) {
          endpoint = `${process.env.REACT_APP_API_URL}/cluster2/node/${encodeURIComponent(rel.target)}`;
        } else if (rel.target.startsWith("cluster4_")) {
          endpoint = `${process.env.REACT_APP_API_URL}/cluster4/node/${encodeURIComponent(rel.target)}`;
        } else if (rel.target === "CL3" || rel.target.startsWith("CL3:") || rel.target.startsWith("HORIZON-CL3-")) {
          endpoint = `${process.env.REACT_APP_API_URL}/cluster3-v2/node/${encodeURIComponent(rel.target)}`;
         } 
        else if (rel.target === "CL5" || rel.target.startsWith("CL5:") || rel.target.startsWith("HORIZON-CL5-")) {
          endpoint = `${process.env.REACT_APP_API_URL}/cluster5-v2/node/${encodeURIComponent(rel.target)}`;
        }
        else {
          endpoint = `${process.env.REACT_APP_API_URL}/nodes/${encodeURIComponent(rel.target)}`;
        }

        try {
          const res = await fetch(endpoint);
          const data = await res.json();
          return { id: rel.target, name: data.name || "" };
        } catch (err) {
          console.error("Failed to fetch target name:", err);
          return { id: rel.target, name: "" };
        }
      });

      const results = await Promise.all(promises);
      const nameMap = {};
      results.forEach((r) => {
        if (r?.id) nameMap[r.id] = r.name;
      });
      setTargetNames((prev) => ({ ...prev, ...nameMap }));
    };

    fetchTargetNames();
  }, [relations]);

  const filtered = relations.filter((rel) => {
    const relType = rel.relation || rel.type;
    if (rel.source !== id) return false;
    if (id.startsWith("cluster2_call_") && relType !== "BELONGS_TO_DESTINATION") return false;
    if (id.startsWith("cluster2_destination_") && relType !== "HAS_CALL") return false;
    return true;
  });

  return (
    <Card className="connections-card">
      <Card.Header><h5>Connections</h5></Card.Header>
      <Card.Body>
        {filtered.length === 0 ? (
          <p>No connections available.</p>
        ) : (
          <ul className="connections-list">
            {filtered.map((rel, idx) => {
              const relType = rel.relation || rel.type || "RELATED";

              const formattedLabel = relType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

              const targetParts = rel.target.split("_");
              const prefixLength = (rel.target.startsWith("cluster2_") || rel.target.startsWith("cluster4_")) ? 2 : 1;
              const labelWithoutPrefix = targetParts.slice(prefixLength).join(" ");
              const formattedTarget = labelWithoutPrefix.replace(/_/g, " ");

              const tooltip = targetNames[rel.target] || formattedTarget;

              return (
                <li key={idx} className="connection-item">
                  <Badge bg="info" className="relation-badge">
                    {formattedLabel}
                  </Badge>
                  <Link
                    to={`/node/${encodeURIComponent(rel.target)}`}
                    onClick={() => localStorage.setItem("graphName", getGraphNameFromId(rel.target))}
                    title={tooltip}
                  >
                    {formattedTarget}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card.Body>
    </Card>
  );
};

export default NodeConnections;
