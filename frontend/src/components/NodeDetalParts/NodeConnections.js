import { useMemo } from "react";
import { Card, Badge } from "react-bootstrap";
import { Link } from "react-router-dom";

function getGraphNameFromId(id) {
  if (id.startsWith("cluster2_")) return "Cluster_2";
  if (id.startsWith("cluster4_")) return "Cluster_4";
  if (id === "CL3" || id.startsWith("CL3:") || id.startsWith("HORIZON-CL3-")) return "Cluster_3";
  return "HE_2025";
}

// Helper: pretty-print a relation name if we need a fallback
function formatRelationLabel(relType = "RELATED") {
  return relType
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Helper: infer a human label (Cluster / Destination / Call / Related)
// based on the neighbor node id pattern; fall back to relation type.
function getConnectionLabel(currentId, neighborId, relType) {
  if (!neighborId) return formatRelationLabel(relType);

  const id = neighborId;

  // Cluster 2 legacy ids
  if (id.startsWith("cluster2_cluster_") || id === "cluster2") return "Cluster";
  if (id.startsWith("cluster2_destination_")) return "Destination";
  if (id.startsWith("cluster2_call_")) return "Call";

  // Generic Horizon / cluster patterns
  // e.g. "CL3", "CL4", ...
  if (/^CL\d$/.test(id)) return "Cluster";

  // e.g. "CL3:effective-management-of-eu-external-borders"
  if (/^CL\d:/.test(id)) return "Destination";

  // e.g. "HORIZON-CL3-2026-01-BM-03", "HORIZON-CL4-2027-04-DATA-03", "HORIZON-HLTH-..."
  if (id.startsWith("HORIZON-CL") || id.startsWith("HORIZON-HLTH-")) return "Call";

  // Fallback: show relation type nicely formatted
  return formatRelationLabel(relType);
}

const NodeConnections = ({ id, relations, connectedNodes = {} }) => {
  const normalizedRelations = useMemo(
    () => (Array.isArray(relations) ? relations : []),
    [relations]
  );

  const filtered = normalizedRelations.filter((rel) => {
    const relType = rel.relation || rel.type;
    const isSource = rel.source === id;
    const isTarget = rel.target === id;
    if (!isSource && !isTarget) return false;

    // Cluster 2 has its own edge semantics; keep these filters as-is
    if (
      id.startsWith("cluster2_call_") &&
      relType !== "BELONGS_TO_DESTINATION" &&
      !(isTarget && relType === "HAS_CALL")
    )
      return false;

    if (
      id.startsWith("cluster2_destination_") &&
      relType !== "HAS_CALL" &&
      !(isTarget && relType === "BELONGS_TO_DESTINATION")
    )
      return false;

    return true;
  });

  return (
    <Card className="connections-card">
      <Card.Header>
        <h5>Connections</h5>
      </Card.Header>
      <Card.Body>
        {filtered.length === 0 ? (
          <p>No connections available.</p>
        ) : (
          <ul className="connections-list">
            {filtered.map((rel, idx) => {
              const relType = rel.relation || rel.type || "RELATED";

              // From the POV of the current node, the "neighbor" is the other end
              const neighborId = rel.source === id ? rel.target : rel.source;
              const detail = connectedNodes[neighborId] || {};
              const itemKey = rel.id || `${rel.source}-${rel.target}-${idx}`;

              const fallbackLabel = (() => {
                if (!neighborId) return "";
                const base = neighborId.replace(/[:_]/g, " ");
                if (neighborId.startsWith("cluster2_") || neighborId.startsWith("cluster4_")) {
                  const parts = neighborId.split("_");
                  return parts.slice(2).join(" ").replace(/_/g, " ");
                }
                return base;
              })();

              const displayName = detail.name || fallbackLabel;
              const tooltip = detail.summary || detail.name || fallbackLabel;

              // NEW: label based on neighbor type instead of raw relation type
              const connectionLabel = getConnectionLabel(id, neighborId, relType);

              return (
                <li key={itemKey} className="connection-item">
                  <Badge bg="info" className="relation-badge">
                    {connectionLabel}
                  </Badge>
                  <div className="connection-content">
                    <Link
                      to={`/node/${encodeURIComponent(neighborId)}`}
                      onClick={() =>
                        localStorage.setItem("graphName", getGraphNameFromId(neighborId))
                      }
                      state={detail.id ? { nodeData: detail } : undefined}
                      title={tooltip}
                    >
                      {displayName || neighborId}
                    </Link>
                    {detail.summary && (
                      <small className="text-muted d-block mt-1">{detail.summary}</small>
                    )}
                  </div>
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
