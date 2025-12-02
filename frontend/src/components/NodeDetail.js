import { useState } from "react";
import { Card, Button, Row, Col, Spinner } from "react-bootstrap";
import GraphHeader from "./GraphHeader";
import { useDarkMode } from "./context/DarkModeContext";
import "../styles/nodedetails.scss";
import { useNodeDetail } from "./NodeDetalParts/useNodeDetail";
import NodeConnections from "./NodeDetalParts/NodeConnections";

const labelMap = {
  funding_link: "Funding Link",
  expected_eu_contribution: "Expected EU Contribution",
  indicative_budget: "Total Budget",
  indicative_number_of_projects: "Indicative Number Of Projects",
  max_funded_projects: "Max Funded Projects",
  deadline: "Deadline",
  trl: "Technology Readiness Level",
  source: "Source",
  call_id: "Call ID",
  scope: "Scope",
  min_contribution: "Min Contribution",
  max_contribution: "Max Contribution",
  type_of_action: "Type Of Action",
};

const metaFieldKeys = [
  "call_id",
  // "call_type",      // removed
  // "call_section",   // removed
  "type_of_action",
  "status",
  "deadline_model",
  "technology_readiness_level",
];

const fundingFieldKeys = [
  "min_contribution",
  "max_contribution",
  "expected_eu_contribution",
  "indicative_budget",
  "indicative_number_of_projects",
  "max_funded_projects",
];

const textFieldConfig = [
  { key: "expected_outcome" },
  { key: "scope" },
  { key: "admissibility_conditions" },
  { key: "eligibility_conditions" },
  { key: "procedure" },
  { key: "legal_and_financial_setup" },
  { key: "exceptional_page_limits" },
];

const RESERVED_DETAIL_KEYS = new Set([
  "id", // we do NOT show raw Id anywhere
  "name",
  "type",
  "opening_date",
  "deadline",
  "funding_link",
  "call_type",
  "call_section",
  ...metaFieldKeys,
  ...fundingFieldKeys,
  ...textFieldConfig.map((field) => field.key),
]);


function toListItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item.trim() : `${item}`)).filter(Boolean);
  }

  const normalized = String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\u2022\s*/g, "\n")
    .replace(/\uFFFD\?\uFFFD/g, "\n");

  const parts = normalized
    .split(/\n{2,}|\u2022/g)
    .map((segment) => segment.replace(/^[\u2022\-\s]+/, "").trim())
    .filter(Boolean);

  if (parts.length > 0) {
    return parts;
  }

  const fallback = normalized.trim();
  return fallback ? [fallback] : [];
}

function CollapsibleList({ label, items }) {
  const [open, setOpen] = useState(false);
  if (!items || items.length === 0) return null;

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
          {open ? "Hide" : "Show"}
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
  if (value === null || value === undefined || value === "") return "—";

  // For amounts in millions
  if (["min_contribution", "max_contribution", "indicative_budget"].includes(key)) {
    const num =
      typeof value === "number"
        ? value
        : parseFloat(String(value).replace(",", "."));
    if (Number.isFinite(num)) {
      return `${num.toLocaleString()} million`;
    }
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString() : value;
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (key === "source") {
    return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return value;
}

function parseMillionFromText(text) {
  if (!text) return null;
  const match = String(text).match(/(\d+[.,]?\d*)/);
  if (!match) return null;
  const num = parseFloat(match[1].replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function computeIndicativeNumberOfProjects(nodeData) {
  // Prefer backend-provided value if present and numeric
  if (nodeData.indicative_number_of_projects != null) {
    const val = nodeData.indicative_number_of_projects;
    const num =
      typeof val === "number"
        ? val
        : parseFloat(String(val).replace(",", "."));
    if (Number.isFinite(num)) return num;
  }

  // New formula: Total Budget (indicative_budget) / Expected EU Contribution
  const totalBudget =
    typeof nodeData.indicative_budget === "number"
      ? nodeData.indicative_budget
      : parseFloat(String(nodeData.indicative_budget || "").replace(",", "."));

  const eu = parseMillionFromText(nodeData.expected_eu_contribution);

  if (!Number.isFinite(totalBudget) || !Number.isFinite(eu) || eu <= 0) {
    return null;
  }

  const projects = Math.round(totalBudget / eu);
  return Number.isFinite(projects) ? projects : null;
}

function NodeDetail() {
  const { darkMode } = useDarkMode();
  const { id, nodeData, relations, connectedNodes, loading } = useNodeDetail();

  if (loading || !nodeData) {
    return (
      <div className="loading-spinner">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  const rawStatus = (nodeData.status || "").trim();
  const isStatusOpen = rawStatus.toLowerCase() === "open";
  const shouldShowStatus = isStatusOpen; // no line for empty or non-Open
  const shouldShowDatesAndLink = !rawStatus || isStatusOpen;

  const displayableKeys = Object.keys(nodeData).filter(
    (key) => !RESERVED_DETAIL_KEYS.has(key)
  );

  const metaFieldsToShow = metaFieldKeys.filter((key) => {
    if (!Object.prototype.hasOwnProperty.call(nodeData, key)) return false;

    if (key === "status") {
      return shouldShowStatus;
    }

    if (key === "deadline_model") {
      const val = (nodeData.deadline_model || "").trim();
      // hide deadline_model if empty
      return val.length > 0;
    }

    return true;
  });

  const fundingFieldsToShow = fundingFieldKeys.filter((key) =>
    key === "indicative_number_of_projects" ||
    Object.prototype.hasOwnProperty.call(nodeData, key)
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
                {shouldShowDatesAndLink && nodeData.opening_date && (
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

                {shouldShowDatesAndLink && nodeData.deadline && (
                  <div className="node-meta-item">
                    <p>
                      <strong>Deadline:</strong> {nodeData.deadline}
                    </p>
                  </div>
                )}

                {metaFieldsToShow.map((key) => {
                  let value = nodeData[key];

                  // If Call Id is missing, fall back to the node's id
                  if (key === "call_id" && (value === null || value === undefined || value === "")) {
                    value = nodeData.id;
                  }

                  return (
                    <div key={key} className="node-meta-item">
                      <p>
                        <strong>{formatLabel(key)}:</strong> {formatValue(key, value)}
                      </p>
                    </div>
                  );
                })}

                {fundingFieldsToShow.length > 0 && (
                  <div className="node-meta-item">
                    {fundingFieldsToShow.map((key) => {
                      let value = nodeData[key];

                      if (key === "indicative_number_of_projects") {
                        const computed = computeIndicativeNumberOfProjects(nodeData);
                        value = computed != null ? computed : value;
                      }

                      return (
                        <p key={key}>
                          <strong>{formatLabel(key)}:</strong> {formatValue(key, value)}
                        </p>
                      );
                    })}
                  </div>
                )}

                {textFieldConfig.map(({ key, label }) => {
                  const value = nodeData[key];
                  if (!value) return null;
                  const items = toListItems(value);
                  if (items.length === 0) return null;

                  return (
                    <div key={key} className="node-meta-item">
                      <CollapsibleList label={label || formatLabel(key)} items={items} />
                    </div>
                  );
                })}

                {displayableKeys.map((key) => (
                  <div key={key} className="node-meta-item">
                    <p>
                      <strong>{formatLabel(key)}:</strong> {formatValue(key, nodeData[key])}
                    </p>
                  </div>
                ))}

                {(id.startsWith("cluster2_call_") || id.startsWith("cluster4_call_")) && (
                  <div className="node-meta-item">
                    <Button
                      variant="primary"
                      style={{ fontWeight: "bold" }}
                      onClick={() => {
                        const stored = JSON.parse(localStorage.getItem("bookmarkedCalls") || "[]");
                        const exists = stored.find((item) => item.id === nodeData.id);
                        if (!exists) {
                          stored.push({ id: nodeData.id, name: nodeData.name });
                          localStorage.setItem("bookmarkedCalls", JSON.stringify(stored));
                          alert("Call bookmarked!");
                        } else {
                          alert("Already bookmarked.");
                        }
                      }}
                    >
                      Bookmark this Call
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col md={4} className="connections-column">
            <NodeConnections id={id} relations={relations} connectedNodes={connectedNodes} />
          </Col>
        </Row>
      </div>
    </>
  );
}

export default NodeDetail;
