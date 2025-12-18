// src/components/NodeDetail.js
import React, { useState, useMemo } from "react";
import {
  Box,
  Button,
  Chip,
  Typography,
  Divider,
  CircularProgress,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EuroIcon from "@mui/icons-material/Euro";
import GroupIcon from "@mui/icons-material/Group";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useNavigate } from "react-router-dom";
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
  trl: "Technology Readiness Level",
  source: "Source",
  call_id: "Call ID",
  scope: "Scope",
  min_contribution: "Min Contribution",
  max_contribution: "Max Contribution",
  type_of_action: "Type Of Action",
};

const textFieldConfig = [
  { key: "expected_outcome", label: "Expected Outcome" },
  { key: "scope", label: "Scope" },
  { key: "eligibility_conditions", label: "Eligibility Conditions" },
  { key: "legal_and_financial_setup", label: "Legal and Financial Setup" },
  { key: "admissibility_conditions", label: "Admissibility Conditions" },
  { key: "procedure", label: "Procedure" },
  { key: "exceptional_page_limits", label: "Exceptional Page Limits" },
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
  return labelMap[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(key, value) {
  if (value === null || value === undefined || value === "") return "—";

  // “million” amounts
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
  // Prefer backend numeric
  if (nodeData.indicative_number_of_projects != null) {
    const val = nodeData.indicative_number_of_projects;
    const num =
      typeof val === "number"
        ? val
        : parseFloat(String(val).replace(",", "."));
    if (Number.isFinite(num)) return num;
  }

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

// crude mapping “Research and Innovation Actions” → “RIA”
function computeTypeShort(typeOfAction) {
  if (!typeOfAction) return null;
  const normalized = typeOfAction.toLowerCase();
  if (normalized.includes("research and innovation")) return "RIA";
  if (normalized.includes("innovation action")) return "IA";
  if (normalized.includes("coordination") && normalized.includes("support"))
    return "CSA";

  // Fallback: first group of 2–4 capital letters, else first word
  const m = typeOfAction.match(/\b([A-Z]{2,4})\b/);
  if (m) return m[1];
  return typeOfAction.split(" ")[0];
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

const TextSectionFromField = ({ nodeData, fieldKey, label }) => {
  const raw = nodeData[fieldKey];
  if (!raw) return null;
  const items = toListItems(raw);
  if (items.length === 0) return null;

  return (
    <CollapsibleSection title={label || formatLabel(fieldKey)} defaultOpen={fieldKey === "expected_outcome"}>
      {items.map((item, idx) => (
        <Typography key={idx} variant="body2" className="nd-paragraph">
          {item}
        </Typography>
      ))}
    </CollapsibleSection>
  );
};

// --- main component ---------------------------------------------------------

function NodeDetail() {
  const { darkMode } = useDarkMode();
  const { id, nodeData, relations, connectedNodes, loading } = useNodeDetail();
  const navigate = useNavigate();
  console.log("NodeDetail render", { nodeData });

  const viewModel = useMemo(() => {
    if (!nodeData) return null;

    const rawType = String(nodeData.type || nodeData.category || "").toLowerCase();
    const isDestination = rawType === "destination";

    const title = nodeData.name || nodeData.label || "Untitled node";

    if (isDestination) {
      return {
        kind: "destination",
        title,
        summary: (nodeData.summary || "").trim(),
      };
    }

    // --- existing Call view model (unchanged) ---
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
    const deadline = nodeData.deadline;
    const openingDate = nodeData.opening_date;
    const source = formatValue("source", nodeData.source || "");
    const callId = nodeData.call_id || nodeData.id;

    const fundingLink = nodeData.funding_link;

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
      deadline,
      openingDate,
      source,
      callId,
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
        {/* HEADER BAR */}
        <header className="nd-header">
          <Box className="nd-header-left">
            <Button
              size="small"
              variant="text"
              startIcon={<ArrowBackIcon fontSize="small" />}
              onClick={() => navigate(-1)}
              className="nd-back-button"
            >
              Back to Graph
            </Button>
            <span className="nd-header-divider" />
            <Chip label="Destination" size="small" className="nd-chip nd-chip--kind" />
          </Box>
        </header>

        {/* MAIN CONTENT */}
        <main className="nd-main">
          <div className="nd-main-inner">
            {/* Title */}
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
            
            {/* Same grid structure as Calls */}
            <div className="nd-grid">
              {/* LEFT: main column */}
              <div className="nd-main-column">
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

              {/* RIGHT: sidebar */}
              <aside className="nd-sidebar">
                {/* Connections */}
                <Box className="nd-card">
                  <Box className="nd-card-header nd-card-header--with-icon">
                    <Typography variant="body2" className="nd-card-title nd-muted-label">
                      Connections
                    </Typography>
                    <InfoOutlinedIcon fontSize="small" className="nd-card-header-icon" />
                  </Box>
                  <Box className="nd-card-body nd-card-body--connections">
                    <NodeConnections
                      id={id}
                      relations={relations}
                      connectedNodes={connectedNodes}
                      bare
                    />
                  </Box>
                </Box>

                {/* Source */}
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

                {/* Actions */}
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
    deadline,
    openingDate,
    source,
    callId,
    fundingLink,
  } = viewModel;

  const isStatusOpen = status.toLowerCase() === "open";

  const handleApplyNow = () => {
    if (fundingLink) {
      window.open(fundingLink, "_blank", "noopener,noreferrer");
    }
  };

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
      {/* HEADER BAR */}
      <header className="nd-header">
        <Box className="nd-header-left">
          <Button
            size="small"
            variant="text"
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={() => navigate(-1)}
            className="nd-back-button"
          >
            Back to Graph
          </Button>
          <span className="nd-header-divider" />
          {typeShort && (
            <Chip label={typeShort} size="small" className="nd-chip nd-chip--kind" />
          )}
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

        <Box className="nd-header-right">
          {fundingLink && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<OpenInNewIcon fontSize="small" />}
              onClick={() => window.open(fundingLink, "_blank", "noopener,noreferrer")}
            >
              View in Portal
            </Button>
          )}
          <Button
            size="small"
            variant="contained"
            onClick={handleApplyNow}
            disabled={!fundingLink}
          >
            Apply Now
          </Button>
        </Box>
      </header>

      {/* MAIN CONTENT */}
      <main className="nd-main">
        <div className="nd-main-inner">
          {/* Title & tags */}
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
                    // optional: truncate if titles are very long
                    wordBreak: "break-word",
                  }}
                >
                  {title}
                </Typography>
                {callId && (
                  <Typography variant="body2" className="nd-call-id">
                    Call ID: {callId}
                  </Typography>
                )}
              </Box>
          </Box>

          {tags.length > 0 && (
            <Box className="nd-tags-row">
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  className="nd-tag-chip"
                  variant="outlined"
                />
              ))}
            </Box>
          )}

          {/* Grid: main (2 columns) + sidebar */}
          <div className="nd-grid">
            {/* LEFT: main column */}
            <div className="nd-main-column">
              {/* Key Information */}
              <Box className="nd-card">
                <Box className="nd-card-header">
                  <Typography
                    variant="body2"
                    className="nd-card-title nd-muted-label"
                  >
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
                        {indicativeProjects != null
                          ? indicativeProjects.toLocaleString()
                          : "—"}
                      </div>
                    </div>

                    {typeOfAction && (
                      <div className="nd-metric nd-metric--full">
                        <div className="nd-metric-label">
                          <InfoOutlinedIcon fontSize="small" className="nd-metric-icon" />
                          <span>Type of Action</span>
                        </div>
                        <div className="nd-metric-value nd-metric-value--small">
                          {typeOfAction}
                        </div>
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
                  </div>
                </Box>
              </Box>

              {/* TRL */}
              {trlText && (
                <Box className="nd-card">
                  <Box className="nd-card-header">
                    <Typography
                      variant="body2"
                      className="nd-card-title nd-muted-label"
                    >
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


              {/* Text sections (Expected Outcome, Scope, etc.) */}
              {textFieldConfig.map(({ key, label }) => (
                <TextSectionFromField
                  key={key}
                  nodeData={nodeData}
                  fieldKey={key}
                  label={label}
                />
              ))}
            </div>

            {/* RIGHT: sidebar */}
            <aside className="nd-sidebar">
              {/* Timeline */}
              {(openingDate || deadline) && (
                <Box className="nd-card">
                  <Box className="nd-card-header">
                    <Typography
                      variant="body2"
                      className="nd-card-title nd-muted-label"
                    >
                      Timeline
                    </Typography>
                  </Box>
                  <Box className="nd-card-body">
                    {openingDate && (
                      <Box className="nd-timeline-row">
                        <CalendarTodayIcon
                          fontSize="small"
                          className="nd-timeline-icon"
                        />
                        <Box>
                          <Typography variant="body2">Opening Date</Typography>
                          <Typography
                            variant="caption"
                            className="nd-muted-text"
                          >
                            {openingDate}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    {deadline && (
                      <Box className="nd-timeline-row">
                        <CalendarTodayIcon
                          fontSize="small"
                          className="nd-timeline-icon"
                        />
                        <Box>
                          <Typography variant="body2">
                            Application Deadline
                          </Typography>
                          <Typography
                            variant="caption"
                            className="nd-muted-text"
                          >
                            {deadline}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {/* Connections – reuse existing component */}
              <Box className="nd-card">
                <Box className="nd-card-header nd-card-header--with-icon">
                  <Typography
                    variant="body2"
                    className="nd-card-title nd-muted-label"
                  >
                    Connections
                  </Typography>
                  <InfoOutlinedIcon
                    fontSize="small"
                    className="nd-card-header-icon"
                  />
                </Box>
                <Box className="nd-card-body nd-card-body--connections">
                  <NodeConnections
                    id={id}
                    relations={relations}
                    connectedNodes={connectedNodes}
                    bare
                  />
                </Box>
              </Box>

              {/* Source */}
              {source && source !== "—" && (
                <Box className="nd-card">
                  <Box className="nd-card-header">
                    <Typography
                      variant="body2"
                      className="nd-card-title nd-muted-label"
                    >
                      Source
                    </Typography>
                  </Box>
                  <Box className="nd-card-body nd-card-body--row">
                    <InfoOutlinedIcon
                      fontSize="small"
                      className="nd-timeline-icon"
                    />
                    <Typography variant="body2">{source}</Typography>
                  </Box>
                </Box>
              )}

              {/* Actions / Bookmark */}
              <Box className="nd-card">
                <Box className="nd-card-header">
                  <Typography
                    variant="body2"
                    className="nd-card-title nd-muted-label"
                  >
                    Actions
                  </Typography>
                </Box>
                <Box className="nd-card-body nd-actions">
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleBookmark}
                  >
                    Bookmark this Call
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

export default NodeDetail;
