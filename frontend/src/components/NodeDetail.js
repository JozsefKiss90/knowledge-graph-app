import React, { useState, useMemo } from "react";
import {
  Box,
  Button,
  Chip,
  Typography,
  CircularProgress,
  useMediaQuery,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EuroIcon from "@mui/icons-material/Euro";
import GroupIcon from "@mui/icons-material/Group";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useNavigate, useLocation } from "react-router-dom";
import { useDarkMode } from "./context/DarkModeContext";
import "../styles/nodedetails.scss";
import { useNodeDetail } from "./NodeDetalParts/useNodeDetail";
import NodeConnections from "./NodeDetalParts/NodeConnections";

// --- helpers reused from previous implementation ---------------------------

const labelMap = {
  funding_link: "Funding Link",
  expected_eu_contribution: "Expected EU Contribution",
  indicative_budget: "Total Budget",
  indicative_number_of_projects: "Indicative Number Of Projects",
  max_funded_projects: "Max Funded Projects",
  deadline: "Deadline",
  deadlines: "Deadlines",
  trl: "Technology Readiness Level",
  source: "Source",
  call_id: "Call ID",
  identifier: "Topic Identifier",
  topic_id: "Topic ID",
  call_identifier: "Call Identifier",
  scope: "Scope",
  min_contribution: "Min Contribution",
  max_contribution: "Max Contribution",
  type_of_action: "Type Of Action",
  opening_date: "Opening Date",
  award_criteria_scoring_thresholds: "Award Criteria / Thresholds",
  admissibility_conditions: "Admissibility Conditions",
  eligible_countries: "Eligible Countries",
  other_eligibility_conditions: "Other Eligibility Conditions",
  financial_and_operational_capacity: "Financial & Operational Capacity",
  submission_and_evaluation_process: "Submission & Evaluation Process",
  proposal_page_limits_mentions: "Proposal Page Limits",
  legal_and_financial_setup: "Legal and Financial Setup",
};

const OFFICIAL_CALL_PAGE_BASE =
  "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/";

function buildOfficialCallPageUrl(topicIdentifierOrId) {
  if (!topicIdentifierOrId) return null;
  return `${OFFICIAL_CALL_PAGE_BASE}${encodeURIComponent(topicIdentifierOrId)}`;
}

// Updated for new schema: removed `eligibility_conditions`, added new fields.
const textFieldConfig = [
  { key: "expected_outcome", label: "Expected Outcome" },
  { key: "scope", label: "Scope" },

  { key: "admissibility_conditions", label: "Admissibility Conditions" },
  { key: "eligible_countries", label: "Eligible Countries" },
  { key: "other_eligibility_conditions", label: "Other Eligibility Conditions" },
  { key: "financial_and_operational_capacity", label: "Financial & Operational Capacity" },
  { key: "submission_and_evaluation_process", label: "Submission & Evaluation Process" },

  { key: "award_criteria_scoring_thresholds", label: "Award Criteria / Thresholds" },

  { key: "proposal_page_limits_mentions", label: "Proposal Page Limits" },
  { key: "legal_and_financial_setup", label: "Legal and Financial Setup" },
];

function toListItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : `${item}`))
      .filter(Boolean);
  }

  const normalized = String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\u2022\s*/g, "\n")
    .replace(/\uFFFD\?\uFFFD/g, "\n");

  const parts = normalized
    .split(/\n{2,}|\u2022/g)
    .map((segment) => segment.replace(/^[\u2022\-\s]+/, "").trim())
    .filter(Boolean);

  if (parts.length > 0) return parts;

  const fallback = normalized.trim();
  return fallback ? [fallback] : [];
}

function formatLabel(key) {
  return (
    labelMap[key] ||
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function formatValue(key, value) {
  if (value === null || value === undefined || value === "") return "—";

  if (["min_contribution", "max_contribution", "indicative_budget"].includes(key)) {
    const num =
      typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
    if (Number.isFinite(num)) return `${num.toLocaleString()} €`;
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString() : value;
  }

  // deadlines array => join lines for display in key-value contexts
  if (Array.isArray(value)) return value.join(", ");

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
  if (nodeData.indicative_number_of_projects != null) {
    const val = nodeData.indicative_number_of_projects;
    const num =
      typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
    if (Number.isFinite(num)) return num;
  }

  const totalBudget =
    typeof nodeData.indicative_budget === "number"
      ? nodeData.indicative_budget
      : parseFloat(String(nodeData.indicative_budget || "").replace(",", "."));

  const eu = parseMillionFromText(nodeData.expected_eu_contribution);

  if (!Number.isFinite(totalBudget) || !Number.isFinite(eu) || eu <= 0) return null;

  const projects = Math.round(totalBudget / eu);
  return Number.isFinite(projects) ? projects : null;
}

function extractTags(nodeData) {
  const candidates = nodeData.related_topics || nodeData.tags || nodeData.themes;
  if (Array.isArray(candidates)) {
    return candidates.map((t) => String(t)).filter(Boolean).slice(0, 6);
  }
  if (typeof candidates === "string") {
    return candidates
      .split(/[;,]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 6);
  }
  return [];
}

function computeTypeShort(typeOfAction) {
  if (!typeOfAction) return null;
  const normalized = typeOfAction.toLowerCase();
  if (normalized.includes("research and innovation")) return "RIA";
  if (normalized.includes("innovation action")) return "IA";
  if (normalized.includes("coordination") && normalized.includes("support")) return "CSA";

  const m = typeOfAction.match(/\b([A-Z]{2,4})\b/);
  if (m) return m[1];
  return typeOfAction.split(" ")[0];
}

// Prefer the best “topic identifier” for linking to official portal.
function getPortalTopicKey(nodeData) {
  return (
    nodeData.identifier ||
    nodeData.topic_id ||
    nodeData.call_id || // legacy fallback
    nodeData.id ||
    null
  );
}

function normalizeDeadlines(nodeData) {
  const arr = Array.isArray(nodeData.deadlines) ? nodeData.deadlines.filter(Boolean) : [];
  const single = nodeData.deadline ? [String(nodeData.deadline)] : [];
  const merged = [...arr, ...single].map((x) => String(x)).filter(Boolean);
  // de-dupe while preserving order
  return Array.from(new Set(merged));
}

// --- UI helpers -------------------------------------------------------------

const CollapsibleSection = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  if (!children) return null;

  return (
    <Box className="nd-card">
      <Box className="nd-card-header nd-card-header--collapsible">
        <Typography variant="body2" className="nd-card-title nd-muted-label">
          {title}
        </Typography>
        <Button
          size="small"
          variant="text"
          className="nd-card-toggle"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide" : "Show"}
        </Button>
      </Box>
      {open && <Box className="nd-card-body nd-card-body--text">{children}</Box>}
    </Box>
  );
};

const TextSectionFromField = ({ nodeData, fieldKey, label, defaultOpen = true }) => {
  const raw = nodeData[fieldKey];
  if (!raw) return null;

  const items = toListItems(raw);
  if (items.length === 0) return null;

  return (
    <CollapsibleSection title={label || formatLabel(fieldKey)} defaultOpen={defaultOpen}>
      {items.map((item, idx) => (
        <Typography key={idx} variant="body2" className="nd-paragraph">
          {item}
        </Typography>
      ))}
    </CollapsibleSection>
  );
};

// --- main component ---------------------------------------------------------

function NodeDetail({ embeddedId, embeddedNodeData, onBack }) {
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();

  const isMobile = useMediaQuery("(max-width: 900px)");

  const { id, nodeData, relations, connectedNodes, loading } = useNodeDetail({
    idOverride: embeddedId,
    initialNodeData: embeddedNodeData,
  });

  const handleBackToGraph = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    const returnLayerKey = String(location.state?.returnLayerKey || "");
    const returnGraphName = String(location.state?.returnGraphName || "");

    const clusterKey =
      returnGraphName.startsWith("Cluster_")
        ? returnGraphName
        : returnLayerKey.startsWith("Cluster_")
        ? returnLayerKey
        : "ROOT";

    localStorage.setItem("graphName", clusterKey);

    if (returnLayerKey.startsWith("DEST_")) {
      const destinationId = returnLayerKey.replace(/^DEST_/, "");
      localStorage.setItem("pendingNav", JSON.stringify({ clusterKey, destinationId }));
    } else {
      localStorage.removeItem("pendingNav");
    }

    navigate("/", { replace: true });
  };

  const viewModel = useMemo(() => {
    if (!nodeData) return null;

    const rawType = String(nodeData.type || nodeData.category || "").toLowerCase();
    const source = String(nodeData.source || "").toLowerCase();
    const isDestination = rawType === "destination";

    const isHeEntity =
      String(nodeData.source || "").toLowerCase() === "he_2025" &&
      rawType !== "call" &&
      nodeData.call_id == null &&
      nodeData.type_of_action == null &&
      nodeData.scope == null;

    const title = nodeData.name || nodeData.label || "Untitled node";

    if (isHeEntity) {
      return { kind: "he_entity", title, summary: (nodeData.summary || "").trim() };
    }

    const deadlines = normalizeDeadlines(nodeData);

    const isCall =
      rawType === "call" ||
      nodeData.call_id != null ||
      nodeData.identifier != null ||
      nodeData.topic_id != null ||
      nodeData.type_of_action != null ||
      nodeData.min_contribution != null ||
      nodeData.max_contribution != null ||
      nodeData.indicative_budget != null ||
      nodeData.expected_outcome != null ||
      nodeData.scope != null ||
      deadlines.length > 0 ||
      nodeData.opening_date != null ||
      nodeData.award_criteria_scoring_thresholds != null;

    if (isDestination) {
      return { kind: "destination", title, summary: (nodeData.summary || "").trim() };
    }

    if (source === "he_2025" && !isCall) {
      return {
        kind: "he_entity",
        title,
        entityType: rawType || "node",
        summary: (nodeData.summary || nodeData.description || "").trim(),
        source: nodeData.source || "",
      };
    }

    const typeOfAction = nodeData.type_of_action || "";
    const typeShort = computeTypeShort(typeOfAction);
    const status = (nodeData.status || "").trim();
    const tags = extractTags(nodeData);

    const minContribution = formatValue("min_contribution", nodeData.min_contribution);
    const maxContribution = formatValue("max_contribution", nodeData.max_contribution);
    const totalBudget = formatValue("indicative_budget", nodeData.indicative_budget);
    const indicativeProjects = computeIndicativeNumberOfProjects(nodeData);

    const trlText =
      nodeData.technology_readiness_level ||
      nodeData.trl ||
      nodeData.technology_readiness ||
      "";

    const expectedEUContribution = nodeData.expected_eu_contribution;
    const openingDate = nodeData.opening_date;

    const portalKey = getPortalTopicKey(nodeData);
    const fundingLink = nodeData.funding_link || nodeData.url || "";

    return {
      kind: "call",
      title,
      typeOfAction,
      typeShort,
      status,
      tags,
      minContribution,
      maxContribution,
      totalBudget,
      indicativeProjects,
      trlText,
      expectedEUContribution,
      deadlines,
      openingDate,
      source,
      portalKey,
      fundingLink,
    };
  }, [nodeData]);

  if (loading || !nodeData || !viewModel) {
    return (
      <div className="nd-loading-wrapper">
        <CircularProgress color="primary" />
      </div>
    );
  }

  // ---------------- HE ENTITY VIEW ----------------
  if (viewModel.kind === "he_entity") {
    const summaryText = viewModel.summary || "—";
    const sourceText = formatValue("source", nodeData.source || "");

    return (
      <div className={`nd-shell ${darkMode ? "nd-shell--dark" : "nd-shell--light"}`}>
        <header className="nd-header">
          <Box className="nd-header-left">
            <Button
              size="small"
              variant="text"
              startIcon={<ArrowBackIcon fontSize="small" />}
              onClick={handleBackToGraph}
            >
              Back to Graph
            </Button>
          </Box>
        </header>

        <main className="nd-main">
          <div className="nd-main-inner">
            <Box className="nd-title-block">
              <Box className="nd-title-dot" />
              <Box className="nd-title-text">
                <Typography
                  variant="h4"
                  className="nd-title"
                  sx={{
                    fontSize: "var(--text-2xl)",
                    fontWeight: 600,
                    lineHeight: 1.4,
                    letterSpacing: "-0.01em",
                    wordBreak: "break-word",
                  }}
                >
                  {viewModel.title}
                </Typography>
                <Typography variant="subtitle2" className="nd-subtitle">
                  Node ID: {nodeData.id || id}
                </Typography>
              </Box>
            </Box>

            <div className="nd-grid">
              <div className="nd-main-column" style={isMobile ? { order: 1 } : undefined}>
                <Box className="nd-card">
                  <Box className="nd-card-header">
                    <Typography variant="body2" className="nd-card-title nd-muted-label">
                      Summary
                    </Typography>
                  </Box>
                  <Box className="nd-card-body nd-card-body--text">
                    <Typography variant="body2" className="nd-paragraph">
                      {summaryText}
                    </Typography>
                  </Box>
                </Box>
              </div>

              <aside className="nd-sidebar" style={isMobile ? { order: 2 } : undefined}>
                <Box className="nd-card">
                  <Box className="nd-card-header nd-card-header--with-icon">
                    <Typography variant="body2" className="nd-card-title nd-muted-label">
                      Connections
                    </Typography>
                    <InfoOutlinedIcon fontSize="small" className="nd-card-header-icon" />
                  </Box>
                  <Box className="nd-card-body nd-card-body--connections">
                    <NodeConnections id={id} relations={relations} connectedNodes={connectedNodes} bare />
                  </Box>
                </Box>

                {sourceText && sourceText !== "—" && (
                  <Box className="nd-card">
                    <Box className="nd-card-header">
                      <Typography variant="body2" className="nd-card-title nd-muted-label">
                        Source
                      </Typography>
                    </Box>
                    <Box className="nd-card-body nd-card-body--row">
                      <InfoOutlinedIcon fontSize="small" className="nd-timeline-icon" />
                      <Typography variant="body2">{sourceText}</Typography>
                    </Box>
                  </Box>
                )}
              </aside>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ---------------- DESTINATION VIEW ----------------
  if (viewModel.kind === "destination") {
    const summaryText = viewModel.summary || "—";
    const sourceText = formatValue("source", nodeData.source || "");

    const handleBookmarkDestination = () => {
      if (!nodeData.id) return;
      const stored = JSON.parse(localStorage.getItem("bookmarkedDestinations") || "[]");
      const exists = stored.find((item) => item.id === nodeData.id);
      if (!exists) {
        stored.push({ id: nodeData.id, name: nodeData.name });
        localStorage.setItem("bookmarkedDestinations", JSON.stringify(stored));
        // eslint-disable-next-line no-alert
        alert("Destination bookmarked!");
      } else {
        // eslint-disable-next-line no-alert
        alert("Already bookmarked.");
      }
    };

    return (
      <div className={`nd-shell ${darkMode ? "nd-shell--dark" : "nd-shell--light"}`}>
        <header className="nd-header">
          <Box className="nd-header-left">
            <Button
              size="small"
              variant="text"
              startIcon={<ArrowBackIcon fontSize="small" />}
              onClick={handleBackToGraph}
              className="nd-back-button"
            >
              Back to Graph
            </Button>
            <span className="nd-header-divider" />
            <Chip label="Destination" size="small" className="nd-chip nd-chip--kind" />
          </Box>
        </header>

        <main className="nd-main">
          <div className="nd-main-inner">
            <Box className="nd-title-block">
              <Box className="nd-title-dot" />
              <Box className="nd-title-text">
                <Typography
                  variant="h1"
                  className="nd-title"
                  sx={{
                    fontSize: "var(--text-2xl)",
                    fontWeight: 600,
                    lineHeight: 1.4,
                    letterSpacing: "-0.01em",
                    wordBreak: "break-word",
                  }}
                >
                  {viewModel.title}
                </Typography>
              </Box>
            </Box>

            <div className="nd-grid">
              <div className="nd-main-column" style={isMobile ? { order: 1 } : undefined}>
                <Box className="nd-card">
                  <Box className="nd-card-header">
                    <Typography variant="body2" className="nd-card-title nd-muted-label">
                      Summary
                    </Typography>
                  </Box>
                  <Box className="nd-card-body nd-card-body--text">
                    <Typography variant="body2" className="nd-paragraph">
                      {summaryText}
                    </Typography>
                  </Box>
                </Box>
              </div>

              <aside className="nd-sidebar" style={isMobile ? { order: 2 } : undefined}>
                <Box className="nd-card">
                  <Box className="nd-card-header nd-card-header--with-icon">
                    <Typography variant="body2" className="nd-card-title nd-muted-label">
                      Connections
                    </Typography>
                    <InfoOutlinedIcon fontSize="small" className="nd-card-header-icon" />
                  </Box>
                  <Box className="nd-card-body nd-card-body--connections">
                    <NodeConnections id={id} relations={relations} connectedNodes={connectedNodes} bare />
                  </Box>
                </Box>

                {sourceText && sourceText !== "—" && (
                  <Box className="nd-card">
                    <Box className="nd-card-header">
                      <Typography variant="body2" className="nd-card-title nd-muted-label">
                        Source
                      </Typography>
                    </Box>
                    <Box className="nd-card-body nd-card-body--row">
                      <InfoOutlinedIcon fontSize="small" className="nd-timeline-icon" />
                      <Typography variant="body2">{sourceText}</Typography>
                    </Box>
                  </Box>
                )}

                <Box className="nd-card">
                  <Box className="nd-card-header">
                    <Typography variant="body2" className="nd-card-title nd-muted-label">
                      Actions
                    </Typography>
                  </Box>
                  <Box className="nd-card-body nd-actions">
                    <Button fullWidth variant="outlined" onClick={handleBookmarkDestination}>
                      Bookmark this Destination
                    </Button>
                  </Box>
                </Box>
              </aside>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ---------------- CALL VIEW ----------------
  const {
    title,
    typeOfAction,
    typeShort,
    status,
    tags,
    minContribution,
    maxContribution,
    totalBudget,
    indicativeProjects,
    trlText,
    expectedEUContribution,
    deadlines,
    openingDate,
    source,
    portalKey,
  } = viewModel;

  const officialCallPageUrl = buildOfficialCallPageUrl(portalKey);
  const isStatusOpen = String(status || "").toLowerCase() === "open";

  const handleBookmark = () => {
    if (!nodeData.id) return;
    const stored = JSON.parse(localStorage.getItem("bookmarkedCalls") || "[]");
    const exists = stored.find((item) => item.id === nodeData.id);
    if (!exists) {
      stored.push({ id: nodeData.id, name: nodeData.name });
      localStorage.setItem("bookmarkedCalls", JSON.stringify(stored));
      // eslint-disable-next-line no-alert
      alert("Call bookmarked!");
    } else {
      // eslint-disable-next-line no-alert
      alert("Already bookmarked.");
    }
  };

  return (
    <div className={`nd-shell ${darkMode ? "nd-shell--dark" : "nd-shell--light"}`}>
      <header className="nd-header">
        <Box className="nd-header-left">
          <Button
            size="small"
            variant="text"
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={handleBackToGraph}
            className="nd-back-button"
          >
            Back to Graph
          </Button>

          <span className="nd-header-divider" />

          {typeShort && <Chip label={typeShort} size="small" className="nd-chip nd-chip--kind" />}

          {status && (
            <Chip
              label={status}
              size="small"
              className={`nd-chip nd-chip--status${
                isStatusOpen ? " nd-chip--status-open" : " nd-chip--status-closed"
              }`}
            />
          )}
        </Box>
      </header>

      <main className="nd-main">
        <div className="nd-main-inner">
          <Box className="nd-title-block">
            <Box className="nd-title-dot" />
            <Box className="nd-title-text">
              <Typography
                variant="h1"
                className="nd-title"
                sx={{
                  fontSize: "var(--text-2xl)",
                  fontWeight: 600,
                  lineHeight: 1.4,
                  letterSpacing: "-0.01em",
                  wordBreak: "break-word",
                }}
              >
                {title}
              </Typography>

              {/* show best identifier for humans */}
              {(nodeData.identifier || nodeData.topic_id || nodeData.call_id) && (
                <Typography variant="body2" className="nd-call-id">
                  {formatLabel(nodeData.identifier ? "identifier" : nodeData.topic_id ? "topic_id" : "call_id")}:{" "}
                  {nodeData.identifier || nodeData.topic_id || nodeData.call_id}
                </Typography>
              )}
            </Box>
          </Box>

          {tags.length > 0 && (
            <Box className="nd-tags-row">
              {tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" className="nd-tag-chip" variant="outlined" />
              ))}
            </Box>
          )}

          <div className="nd-grid">
            {/* MAIN COLUMN */}
            <div className="nd-main-column" style={isMobile ? { order: 1 } : undefined}>
              <Box className="nd-card">
                <Box className="nd-card-header">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    Key Information
                  </Typography>
                </Box>

                <Box className="nd-card-body">
                  <div className="nd-metrics-grid">
                    <div className="nd-metric">
                      <div className="nd-metric-label">
                        <EuroIcon fontSize="small" className="nd-metric-icon" />
                        <span>Min Contribution</span>
                      </div>
                      <div className="nd-metric-value">{minContribution}</div>
                    </div>

                    <div className="nd-metric">
                      <div className="nd-metric-label">
                        <EuroIcon fontSize="small" className="nd-metric-icon" />
                        <span>Max Contribution</span>
                      </div>
                      <div className="nd-metric-value">{maxContribution}</div>
                    </div>

                    <div className="nd-metric">
                      <div className="nd-metric-label">
                        <EuroIcon fontSize="small" className="nd-metric-icon" />
                        <span>Total Budget</span>
                      </div>
                      <div className="nd-metric-value">{totalBudget}</div>
                    </div>

                    <div className="nd-metric">
                      <div className="nd-metric-label">
                        <GroupIcon fontSize="small" className="nd-metric-icon" />
                        <span>Indicative Projects</span>
                      </div>
                      <div className="nd-metric-value">
                        {indicativeProjects != null ? indicativeProjects.toLocaleString() : "—"}
                      </div>
                    </div>

                    {typeOfAction && (
                      <div className="nd-metric nd-metric--full">
                        <div className="nd-metric-label">
                          <InfoOutlinedIcon fontSize="small" className="nd-metric-icon" />
                          <span>Type of Action</span>
                        </div>
                        <div className="nd-metric-value nd-metric-value--small">{typeOfAction}</div>
                      </div>
                    )}

                    {expectedEUContribution && (
                      <div className="nd-metric nd-metric--full">
                        <div className="nd-metric-label">
                          <EuroIcon fontSize="small" className="nd-metric-icon" />
                          <span>Expected EU Contribution</span>
                        </div>
                        <div className="nd-metric-value nd-metric-value--small">
                          {expectedEUContribution}
                        </div>
                      </div>
                    )}

                    {/* Nice-to-have identity fields when present */}
                    {(nodeData.call_identifier || nodeData.programme) && (
                      <div className="nd-metric nd-metric--full">
                        <div className="nd-metric-label">
                          <InfoOutlinedIcon fontSize="small" className="nd-metric-icon" />
                          <span>Identifiers</span>
                        </div>
                        <div className="nd-metric-value nd-metric-value--small">
                          {nodeData.programme ? `Programme: ${nodeData.programme}` : ""}
                          {nodeData.programme && nodeData.call_identifier ? " • " : ""}
                          {nodeData.call_identifier ? `Call: ${nodeData.call_identifier}` : ""}
                        </div>
                      </div>
                    )}
                  </div>
                </Box>
              </Box>

              {trlText && (
                <Box className="nd-card">
                  <Box className="nd-card-header">
                    <Typography variant="body2" className="nd-card-title nd-muted-label">
                      Technology Readiness Level
                    </Typography>
                  </Box>
                  <Box className="nd-card-body nd-card-body--text">
                    <Typography variant="body2" className="nd-paragraph">
                      {trlText}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Text sections */}
              {textFieldConfig.map(({ key, label }) => (
                <TextSectionFromField
                  key={key}
                  nodeData={nodeData}
                  fieldKey={key}
                  label={label}
                  defaultOpen={
                    isMobile
                      ? !["expected_outcome", "scope"].includes(key)
                      : key === "expected_outcome"
                  }
                />
              ))}
            </div>

            {/* SIDEBAR */}
            <aside className="nd-sidebar" style={isMobile ? { order: 2 } : undefined}>
              {(openingDate || (deadlines && deadlines.length > 0)) && (
                <Box className="nd-card">
                  <Box className="nd-card-header">
                    <Typography variant="body2" className="nd-card-title nd-muted-label">
                      Timeline
                    </Typography>
                  </Box>

                  <Box className="nd-card-body">
                    {openingDate && (
                      <Box className="nd-timeline-row">
                        <CalendarTodayIcon fontSize="small" className="nd-timeline-icon" />
                        <Box>
                          <Typography variant="body2">Opening Date</Typography>
                          <Typography variant="caption" className="nd-muted-text">
                            {openingDate}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {deadlines && deadlines.length > 0 && (
                      <Box className="nd-timeline-row" sx={{ alignItems: "flex-start" }}>
                        <CalendarTodayIcon fontSize="small" className="nd-timeline-icon" />
                        <Box>
                          <Typography variant="body2">
                            Application Deadline{deadlines.length > 1 ? "s" : ""}
                          </Typography>
                          {deadlines.map((dl, idx) => (
                            <Typography key={`${dl}-${idx}`} variant="caption" className="nd-muted-text" display="block">
                              {dl}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>

                  <Box className="nd-header-right" sx={{ paddingTop: "20px" }}>
                    {officialCallPageUrl && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<OpenInNewIcon fontSize="small" />}
                        onClick={() =>
                          window.open(officialCallPageUrl, "_blank", "noopener,noreferrer")
                        }
                      >
                        Official Call Page
                      </Button>
                    )}
                  </Box>
                </Box>
              )}

              <Box className="nd-card">
                <Box className="nd-card-header">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    Actions
                  </Typography>
                </Box>
                <Box className="nd-card-body nd-actions">
                  <Button fullWidth variant="outlined" onClick={handleBookmark}>
                    Bookmark this Call
                  </Button>
                </Box>
              </Box>

              <Box className="nd-card">
                <Box className="nd-card-header nd-card-header--with-icon">
                  <Typography variant="body2" className="nd-card-title nd-muted-label">
                    Connections
                  </Typography>
                  <InfoOutlinedIcon fontSize="small" className="nd-card-header-icon" />
                </Box>
                <Box className="nd-card-body nd-card-body--connections">
                  <NodeConnections id={id} relations={relations} connectedNodes={connectedNodes} bare />
                </Box>
              </Box>

              {source && source !== "—" && (
                <Box className="nd-card">
                  <Box className="nd-card-header">
                    <Typography variant="body2" className="nd-card-title nd-muted-label">
                      Source
                    </Typography>
                  </Box>
                  <Box className="nd-card-body nd-card-body--row">
                    <InfoOutlinedIcon fontSize="small" className="nd-timeline-icon" />
                    <Typography variant="body2">{formatValue("source", source)}</Typography>
                  </Box>
                </Box>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

export default NodeDetail;
