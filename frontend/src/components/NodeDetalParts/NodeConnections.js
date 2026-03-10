import { useMemo } from "react";
import { Card, Badge } from "react-bootstrap";
import { Link } from "react-router-dom";

function inferGraphNameFromId(id = "", detail = {}) {
  const value = String(id || "").trim();
  const sourceGraph = String(
    detail.graphName || detail.source_graph || detail.source || ""
  ).trim();

  if (sourceGraph) {
    const normalizedSource = sourceGraph.replace(/_cose$/i, "");
    const sourceMap = {
      Cluster_1: "Cluster_1",
      Cluster_2: "Cluster_2",
      Cluster_3: "Cluster_3",
      Cluster_4: "Cluster_4",
      Cluster_5: "Cluster_5",
      Cluster_6: "Cluster_6",
      WIDERA: "WIDERA",
      DEP: "DEP",
      ERASMUS: "ERASMUS",
      CEF: "CEF",
      CREA: "CREA",
      EURATOM: "EURATOM",
      ERC: "ERC",
      MSCA: "MSCA",
      INFRA: "INFRA",
      EIC: "EIC",
      EIE: "EIE",
      MISS: "MISS",
      missions: "MISS",
      dep: "DEP",
      erasmus: "ERASMUS",
      cef: "CEF",
      crea: "CREA",
      euratom: "EURATOM",
      erc: "ERC",
      msca: "MSCA",
      infra: "INFRA",
      eic: "EIC",
      eie: "EIE",
      widera: "WIDERA",
      he_2025: "HE_2025",
      HE_2025: "HE_2025",
    };

    if (sourceMap[normalizedSource]) {
      return sourceMap[normalizedSource];
    }
  }

  // Cluster legacy / normalized patterns
  if (
    value === "CL1" ||
    value.startsWith("CL1:") ||
    value.startsWith("HORIZON-CL1-") ||
    value.startsWith("HORIZON-HLTH-") ||
    value.startsWith("cluster1_")
  ) {
    return "Cluster_1";
  }

  if (
    value === "CL2" ||
    value.startsWith("CL2:") ||
    value.startsWith("HORIZON-CL2-") ||
    value.startsWith("cluster2_")
  ) {
    return "Cluster_2";
  }

  if (
    value === "CL3" ||
    value.startsWith("CL3:") ||
    value.startsWith("HORIZON-CL3-") ||
    value.startsWith("cluster3_")
  ) {
    return "Cluster_3";
  }

  if (
    value === "CL4" ||
    value.startsWith("CL4:") ||
    value.startsWith("HORIZON-CL4-") ||
    value.startsWith("cluster4_")
  ) {
    return "Cluster_4";
  }

  if (
    value === "CL5" ||
    value.startsWith("CL5:") ||
    value.startsWith("HORIZON-CL5-") ||
    value.startsWith("cluster5_")
  ) {
    return "Cluster_5";
  }

  if (
    value === "CL6" ||
    value.startsWith("CL6:") ||
    value.startsWith("HORIZON-CL6-") ||
    value.startsWith("cluster6_")
  ) {
    return "Cluster_6";
  }

  // Pillar I
  if (value.startsWith("ERC-") || value.startsWith("erc_")) return "ERC";
  if (
    value.startsWith("MSCA-") ||
    value.startsWith("HORIZON-MSCA-") ||
    value.startsWith("msca_")
  ) {
    return "MSCA";
  }
  if (
    value.startsWith("INFRA-") ||
    value.startsWith("HORIZON-INFRA-") ||
    value.startsWith("infra_")
  ) {
    return "INFRA";
  }

  // Missions
  if (
    value.startsWith("MISS-") ||
    value.startsWith("mission_") ||
    value.startsWith("missions_") ||
    value.startsWith("HORIZON-MISS-")
  ) {
    return "MISS";
  }

  // Pillar III
  if (
    value.startsWith("EIC-") ||
    value.startsWith("HORIZON-EIC-") ||
    value.startsWith("eic_")
  ) {
    return "EIC";
  }
  if (
    value.startsWith("EIE-") ||
    value.startsWith("HORIZON-EIE-") ||
    value.startsWith("eie_")
  ) {
    return "EIE";
  }

  // Cross-pillar / standalone programmes
  if (
    value.startsWith("WIDERA-") ||
    value.startsWith("HORIZON-WIDERA-") ||
    value.startsWith("widera_")
  ) {
    return "WIDERA";
  }

  if (
    value.startsWith("DIGITAL-") ||
    value.startsWith("DEP-") ||
    value.startsWith("dep_")
  ) {
    return "DEP";
  }

  if (
    value.startsWith("ERASMUS-") ||
    value.startsWith("erasmus_") ||
    value.includes("KA1") ||
    value.includes("KA2") ||
    value.includes("KA3")
  ) {
    return "ERASMUS";
  }

  if (value.startsWith("CEF-") || value.startsWith("cef_")) return "CEF";
  if (value.startsWith("CREA-") || value.startsWith("crea_")) return "CREA";
  if (value.startsWith("EURATOM-") || value.startsWith("euratom_")) {
    return "EURATOM";
  }

  return "HE_2025";
}

function buildLinkState(neighborId, detail) {
  const graphName = inferGraphNameFromId(neighborId, detail);

  return {
    nodeData: detail?.id ? detail : undefined,
    returnGraphName: graphName,
    graphName,
  };
}

function getFallbackLabel(neighborId = "") {
  if (!neighborId) return "";

  if (
    neighborId.startsWith("cluster2_") ||
    neighborId.startsWith("cluster4_") ||
    neighborId.startsWith("cluster1_") ||
    neighborId.startsWith("cluster3_") ||
    neighborId.startsWith("cluster5_") ||
    neighborId.startsWith("cluster6_")
  ) {
    const parts = neighborId.split("_");
    return parts.slice(2).join(" ").replace(/_/g, " ");
  }

  if (/^CL\d:/.test(neighborId)) {
    return neighborId.split(":").slice(1).join(":").trim() || neighborId;
  }

  return neighborId.replace(/[:_]/g, " ");
}

// Helper: pretty-print a relation name if we need a fallback
function formatRelationLabel(relType = "RELATED") {
  return String(relType || "RELATED")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Helper: infer a human label (Programme / Cluster / Destination / Call / Related)
function getConnectionLabel(currentId, neighborId, relType, detail = {}) {
  if (!neighborId) return formatRelationLabel(relType);

  const id = String(neighborId);
  const rawType = String(detail.type || detail.category || "").toLowerCase();

  if (rawType === "programme") return "Programme";
  if (rawType === "cluster") return "Cluster";
  if (rawType === "destination") return "Destination";
  if (rawType === "call") return "Call";

  // Cluster 2 legacy ids
  if (id.startsWith("cluster2_cluster_") || id === "cluster2") return "Cluster";
  if (id.startsWith("cluster2_destination_")) return "Destination";
  if (id.startsWith("cluster2_call_")) return "Call";

  // Generic cluster patterns
  if (/^CL\d$/.test(id)) return "Cluster";
  if (/^CL\d:/.test(id)) return "Destination";

  // Programme/call patterns
  if (
    id.startsWith("HORIZON-CL") ||
    id.startsWith("HORIZON-HLTH-") ||
    id.startsWith("HORIZON-WIDERA-") ||
    id.startsWith("HORIZON-MSCA-") ||
    id.startsWith("HORIZON-INFRA-") ||
    id.startsWith("HORIZON-EIC-") ||
    id.startsWith("HORIZON-EIE-") ||
    id.startsWith("HORIZON-MISS-") ||
    id.startsWith("DIGITAL-") ||
    id.startsWith("DEP-") ||
    id.startsWith("ERASMUS-") ||
    id.startsWith("CEF-") ||
    id.startsWith("CREA-") ||
    id.startsWith("EURATOM-") ||
    id.startsWith("ERC-")
  ) {
    return "Call";
  }

  if (
    id.startsWith("widera_") ||
    id.startsWith("dep_") ||
    id.startsWith("erasmus_") ||
    id.startsWith("cef_") ||
    id.startsWith("crea_") ||
    id.startsWith("euratom_") ||
    id.startsWith("erc_") ||
    id.startsWith("msca_") ||
    id.startsWith("infra_") ||
    id.startsWith("eic_") ||
    id.startsWith("eie_") ||
    id.startsWith("mission_") ||
    id.startsWith("missions_")
  ) {
    return "Call";
  }

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
    ) {
      return false;
    }

    if (
      id.startsWith("cluster2_destination_") &&
      relType !== "HAS_CALL" &&
      !(isTarget && relType === "BELONGS_TO_DESTINATION")
    ) {
      return false;
    }

    return true;
  });

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

          const fallbackLabel = getFallbackLabel(neighborId);
          const displayName = detail.name || detail.label || fallbackLabel;
          const tooltip =
            detail.summary || detail.name || detail.label || fallbackLabel;
          const connectionLabel = getConnectionLabel(id, neighborId, relType, detail);
          const graphName = inferGraphNameFromId(neighborId, detail);
          const linkState = buildLinkState(neighborId, detail);

          return (
            <div key={itemKey} className="nd-connection-box">
              <div className="nd-connection-box-header">
                <span className="nd-connection-dot" />
                <div className="nd-connection-box-text">
                  <Link
                    to={`/node/${encodeURIComponent(neighborId)}`}
                    onClick={() => localStorage.setItem("graphName", graphName)}
                    state={linkState}
                    title={tooltip}
                    className="nd-connection-title"
                  >
                    {displayName || neighborId}
                  </Link>
                  <div className="nd-connection-sub">{connectionLabel}</div>
                </div>
              </div>
              {detail.summary && (
                <div className="nd-connection-summary">{detail.summary}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

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

            const fallbackLabel = getFallbackLabel(neighborId);
            const displayName = detail.name || detail.label || fallbackLabel;
            const tooltip =
              detail.summary || detail.name || detail.label || fallbackLabel;
            const connectionLabel = getConnectionLabel(id, neighborId, relType, detail);
            const graphName = inferGraphNameFromId(neighborId, detail);
            const linkState = buildLinkState(neighborId, detail);

            return (
              <li key={itemKey} className="nd-connection-item">
                <Badge bg="info" className="nd-connection-badge">
                  {connectionLabel}
                </Badge>
                <div className="nd-connection-content">
                  <Link
                    to={`/node/${encodeURIComponent(neighborId)}`}
                    onClick={() => localStorage.setItem("graphName", graphName)}
                    state={linkState}
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