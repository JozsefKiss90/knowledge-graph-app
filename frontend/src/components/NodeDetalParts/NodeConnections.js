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
function getConnectionLabel(currentId, neighborId, relType) {
  if (!neighborId) return formatRelationLabel(relType);

  const id = neighborId;

  // Cluster 2 legacy ids
  if (id.startsWith("cluster2_cluster_") || id === "cluster2") return "Cluster";
  if (id.startsWith("cluster2_destination_")) return "Destination";
  if (id.startsWith("cluster2_call_")) return "Call";

  // Generic Horizon / cluster patterns
  if (/^CL\d$/.test(id)) return "Cluster";
  if (/^CL\d:/.test(id)) return "Destination";
  if (id.startsWith("HORIZON-CL") || id.startsWith("HORIZON-HLTH-")) return "Call";

  return formatRelationLabel(relType);
}

const NodeConnections = ({ id, relations, connectedNodes = {}, bare = false }) => {
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

  // ---------- Figma-style rendering for NodeDetail (bare=true) ----------
  if (bare) {
    if (filtered.length === 0) {
      return <p className="nd-connections-empty">No connections available.</p>;
    }

    return (
      <div className="nd-connections-stack">
        {filtered.map((rel, idx) => {
          const relType = rel.relation || rel.type || "RELATED";
          const neighborId = rel.source === id ? rel.target : rel.source;
          const detail = connectedNodes[neighborId] || {};
          const itemKey = rel.id || `${rel.source}-${rel.target}-${idx}`;

          const fallbackLabel = (() => {
            if (!neighborId) return "";
            const base = neighborId.replace(/[:_]/g, " ");
            if (
              neighborId.startsWith("cluster2_") ||
              neighborId.startsWith("cluster4_")
            ) {
              const parts = neighborId.split("_");
              return parts.slice(2).join(" ").replace(/_/g, " ");
            }
            return base;
          })();

          const displayName = detail.name || fallbackLabel;
          const tooltip = detail.summary || detail.name || fallbackLabel;
          const connectionLabel = getConnectionLabel(id, neighborId, relType);

          return (
            <div key={itemKey} className="nd-connection-box">
              <div className="nd-connection-box-header">
                <span className="nd-connection-dot" />
                <div className="nd-connection-box-text">
                  <Link
                    to={`/node/${encodeURIComponent(neighborId)}`}
                    onClick={() =>
                      localStorage.setItem(
                        "graphName",
                        getGraphNameFromId(neighborId)
                      )
                    }
                    state={detail.id ? { nodeData: detail } : undefined}
                    title={tooltip}
                    className="nd-connection-title"
                  >
                    {displayName || neighborId}
                  </Link>
                  <div className="nd-connection-sub">{connectionLabel}</div>
                </div>
              </div>
              {detail.summary && (
                <div className="nd-connection-summary">
                  {detail.summary}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ---------- Legacy wrapper for other usages ----------
  const content = (
    <>
      {filtered.length === 0 ? (
        <p className="nd-connections-empty">No connections available.</p>
      ) : (
        <ul className="nd-connections-list">
          {filtered.map((rel, idx) => {
            const relType = rel.relation || rel.type || "RELATED";
            const neighborId = rel.source === id ? rel.target : rel.source;
            const detail = connectedNodes[neighborId] || {};
            const itemKey = rel.id || `${rel.source}-${rel.target}-${idx}`;

            const fallbackLabel = (() => {
              if (!neighborId) return "";
              const base = neighborId.replace(/[:_]/g, " ");
              if (
                neighborId.startsWith("cluster2_") ||
                neighborId.startsWith("cluster4_")
              ) {
                const parts = neighborId.split("_");
                return parts.slice(2).join(" ").replace(/_/g, " ");
              }
              return base;
            })();

            const displayName = detail.name || fallbackLabel;
            const tooltip = detail.summary || detail.name || fallbackLabel;
            const connectionLabel = getConnectionLabel(id, neighborId, relType);

            return (
              <li key={itemKey} className="nd-connection-item">
                <Badge bg="info" className="nd-connection-badge">
                  {connectionLabel}
                </Badge>
                <div className="nd-connection-content">
                  <Link
                    to={`/node/${encodeURIComponent(neighborId)}`}
                    onClick={() =>
                      localStorage.setItem(
                        "graphName",
                        getGraphNameFromId(neighborId)
                      )
                    }
                    state={detail.id ? { nodeData: detail } : undefined}
                    title={tooltip}
                  >
                    {displayName || neighborId}
                  </Link>
                  {detail.summary && (
                    <small className="nd-connection-summary">
                      {detail.summary}
                    </small>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  return (
    <Card className="connections-card">
      <Card.Header>
        <h5>Connections</h5>
      </Card.Header>
      <Card.Body>{content}</Card.Body>
    </Card>
  );
};

export default NodeConnections;
