import React, { useState, useMemo, useCallback } from "react";
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
import CordisEvidencePanel from "./GraphPage/CordisEvidence/CordisEvidencePanel";

// --- lightweight markdown-to-JSX renderer for wiki body text ---------------

// Build a resolver from the node's already-fetched neighbors: maps a wikilink's
// display target (name / alias / id / slug) to that neighbor's id. Returns null
// for links that aren't connected nodes (e.g. dangling [[index]]), so those stay
// plain text instead of becoming dead links.
function makeWikiResolver(connectedNodes) {
  const map = new Map();
  const add = (text, entry) => {
    const k = String(text || "").trim().toLowerCase();
    if (k && !map.has(k)) map.set(k, entry);
  };
  Object.entries(connectedNodes || {}).forEach(([nid, d]) => {
    const entry = { id: nid, data: d || undefined };
    add(nid, entry);
    add(d?.name, entry);
    add(d?.label, entry);
    (Array.isArray(d?.aliases) ? d.aliases : []).forEach((a) => add(a, entry));
  });
  return (rawInner) => {
    const target = String(rawInner || "").split("|")[0].split("#")[0].trim().toLowerCase();
    if (!target) return null;
    if (map.has(target)) return map.get(target);
    const slug = target.replace(/[^a-z0-9\-._() ]+/g, "").replace(/\s+/g, "-");
    return map.has(slug) ? map.get(slug) : null;
  };
}

function renderMarkdownBody(text, renderWikiLink) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let listBuffer = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="nd-md-list">
        {listBuffer.map((item, i) => (
          <li key={i}>{inlineMarkdown(item, renderWikiLink)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // blank line
    if (!line.trim()) {
      flushList();
      continue;
    }

    // headings
    const hMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      const Tag = level === 1 ? "h3" : level === 2 ? "h4" : "h5";
      elements.push(
        <Tag key={key++} className="nd-md-heading">
          {inlineMarkdown(hMatch[2], renderWikiLink)}
        </Tag>
      );
      continue;
    }

    // list item
    const liMatch = line.match(/^\s*[-*]\s+(.*)/);
    if (liMatch) {
      listBuffer.push(liMatch[1]);
      continue;
    }

    // paragraph line
    flushList();
    elements.push(
      <p key={key++} className="nd-paragraph">
        {inlineMarkdown(line, renderWikiLink)}
      </p>
    );
  }

  flushList();
  return elements;
}

function inlineMarkdown(text, renderWikiLink) {
  // Split on bold (**...**), wiki links ([[...]]), and reassemble as JSX
  const parts = [];
  let remaining = text;
  let i = 0;

  const regex = /(\*\*(.+?)\*\*|\[\[(.+?)\]\])/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(remaining.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // bold
      parts.push(<strong key={i++}>{match[2]}</strong>);
    } else if (match[3]) {
      // wiki link — clickable when it resolves to a connected node, else plain text
      parts.push(
        <React.Fragment key={i++}>
          {renderWikiLink ? renderWikiLink(match[3]) : <em>{match[3]}</em>}
        </React.Fragment>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < remaining.length) {
    parts.push(remaining.slice(lastIndex));
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}

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
  eligibility_conditions: "Eligibility Conditions",
  eligible_countries: "Eligible Countries",
  other_eligibility_conditions: "Other Eligibility Conditions",
  financial_and_operational_capacity: "Financial & Operational Capacity",
  submission_and_evaluation_process: "Submission & Evaluation Process",
  proposal_page_limits_mentions: "Proposal Page Limits",
  legal_and_financial_setup: "Legal and Financial Setup",

  // new description section fields
  description_root: "Description",
  objective: "Objective",
  expected_outcome: "Expected Outcome",
  expected_results: "Expected Results",
  expected_impact: "Expected Impact",
  specific_challenge: "Specific Challenge",
  challenge: "Challenge",
  background: "Background",
  context: "Context",
  eligible_applicants: "Eligible Applicants",
  eligible_activities: "Eligible Activities",
  funding_rules: "Funding Rules",
  conditions_for_participation: "Conditions For Participation",
  application_procedure: "Application Procedure",
  submission: "Submission",
  evaluation: "Evaluation",
  award_criteria: "Award Criteria",
  implementation: "Implementation",
  work_programme: "Work Programme",
  additional_information: "Additional Information",
  tags_from_description: "Tags From Description",
};

const OFFICIAL_CALL_PAGE_BASE =
  "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/";

function buildOfficialCallPageUrl(topicIdentifierOrId) {
  if (!topicIdentifierOrId) return null;
  return `${OFFICIAL_CALL_PAGE_BASE}${encodeURIComponent(topicIdentifierOrId)}`;
}

const CANONICAL_DESCRIPTION_SECTION_KEYS = [
  "description_root",
  "objective",
  "scope",
  "expected_outcome",
  "expected_results",
  "expected_impact",
  "specific_challenge",
  "challenge",
  "background",
  "context",
  "eligible_applicants",
  "eligible_activities",
  "funding_rules",
  "conditions_for_participation",
  "application_procedure",
  "submission",
  "evaluation",
  "award_criteria",
  "implementation",
  "work_programme",
  "additional_information",
];

// Primary rendering order for long-form text sections.
const baseTextFieldConfig = [
  { key: "description_root", label: "Description" },
  { key: "objective", label: "Objective" },
  { key: "expected_outcome", label: "Expected Outcome" },
  { key: "expected_results", label: "Expected Results" },
  { key: "expected_impact", label: "Expected Impact" },
  { key: "scope", label: "Scope" },
  { key: "specific_challenge", label: "Specific Challenge" },
  { key: "challenge", label: "Challenge" },
  { key: "background", label: "Background" },
  { key: "context", label: "Context" },

  { key: "admissibility_conditions", label: "Admissibility Conditions" },
  { key: "eligibility_conditions", label: "Eligibility Conditions" },
  { key: "eligible_applicants", label: "Eligible Applicants" },
  { key: "eligible_activities", label: "Eligible Activities" },
  { key: "eligible_countries", label: "Eligible Countries" },
  { key: "other_eligibility_conditions", label: "Other Eligibility Conditions" },
  { key: "conditions_for_participation", label: "Conditions For Participation" },
  { key: "financial_and_operational_capacity", label: "Financial & Operational Capacity" },

  { key: "application_procedure", label: "Application Procedure" },
  { key: "submission", label: "Submission" },
  { key: "submission_and_evaluation_process", label: "Submission & Evaluation Process" },
  { key: "evaluation", label: "Evaluation" },
  { key: "award_criteria", label: "Award Criteria" },
  { key: "award_criteria_scoring_thresholds", label: "Award Criteria / Thresholds" },

  { key: "funding_rules", label: "Funding Rules" },
  { key: "implementation", label: "Implementation" },
  { key: "work_programme", label: "Work Programme" },
  { key: "proposal_page_limits_mentions", label: "Proposal Page Limits" },
  { key: "legal_and_financial_setup", label: "Legal and Financial Setup" },
  { key: "additional_information", label: "Additional Information" },
];

function hasRenderableValue(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.some((v) => String(v ?? "").trim());
  if (typeof value === "object") return Object.keys(value).length > 0;
  return String(value).trim() !== "";
}

function formatDateShort(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDynamicDescriptionSectionConfig(nodeData) {
  const advertised = Array.isArray(nodeData?._description_section_keys)
    ? nodeData._description_section_keys.filter((k) => typeof k === "string" && k.trim())
    : [];

  const existingKeys = new Set(baseTextFieldConfig.map((f) => f.key));
  const dynamic = [];

  for (const key of advertised) {
    if (!existingKeys.has(key) && hasRenderableValue(nodeData?.[key])) {
      dynamic.push({ key, label: formatLabel(key) });
    }
  }

  return dynamic;
}

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
  const candidates =
    nodeData.related_topics ||
    nodeData.tags ||
    nodeData.tags_from_description ||
    nodeData.themes;

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

function getPortalTopicKey(nodeData) {
  return (
    nodeData.identifier ||
    nodeData.topic_id ||
    nodeData.call_id ||
    nodeData.id ||
    null
  );
}

function normalizeDeadlines(nodeData) {
  const arr = Array.isArray(nodeData.deadlines) ? nodeData.deadlines.filter(Boolean) : [];
  const single = nodeData.deadline ? [String(nodeData.deadline)] : [];
  const merged = [...arr, ...single].map((x) => String(x)).filter(Boolean);
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
  if (!hasRenderableValue(raw)) return null;

  if (fieldKey === "tags_from_description") {
    const items = Array.isArray(raw)
      ? raw.map((x) => String(x).trim()).filter(Boolean)
      : toListItems(raw);

    if (items.length === 0) return null;

    return (
      <CollapsibleSection title={label || formatLabel(fieldKey)} defaultOpen={defaultOpen}>
        <Box className="nd-tags-row">
          {items.map((item) => (
            <Chip
              key={item}
              label={item}
              size="small"
              className="nd-tag-chip"
              variant="filled"
            />
          ))}
        </Box>
      </CollapsibleSection>
    );
  }

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

// add near the other helpers

function parseValidDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getLatestDeadline(deadlines = []) {
  const parsed = deadlines
    .map(parseValidDate)
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime());

  return parsed[0] || null;
}

function normalizeStatusLabel(status) {
  const raw = String(status || "").trim().toLowerCase();
  if (!raw) return "";

  if (raw === "open") return "Open";
  if (raw === "closed") return "Closed";
  if (raw === "forthcoming" || raw === "upcoming") return "Forthcoming";

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function inferCallStatus(nodeData, deadlines) {
  const explicit = normalizeStatusLabel(nodeData?.status);
  if (explicit) return explicit;

  const now = new Date();
  const openingDate = parseValidDate(nodeData?.opening_date);
  const latestDeadline = getLatestDeadline(deadlines);

  // Not yet opened
  if (openingDate && openingDate.getTime() > now.getTime()) {
    return "Forthcoming";
  }

  // Open until the last known application deadline passes
  if (latestDeadline) {
    return latestDeadline.getTime() >= now.getTime() ? "Open" : "Closed";
  }

  // Fallback: if we only know it has opened but no deadline is present
  if (openingDate && openingDate.getTime() <= now.getTime()) {
    return "Open";
  }

  return "";
}

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

  const textFieldConfig = useMemo(() => {
    if (!nodeData) return baseTextFieldConfig;

    const dynamicFields = getDynamicDescriptionSectionConfig(nodeData);

    return [...baseTextFieldConfig, ...dynamicFields];
  }, [nodeData]);

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
      (source === "he_wiki" || source === "he_2025") &&
      rawType !== "call" &&
      nodeData.call_id == null &&
      nodeData.type_of_action == null;

    const title = nodeData.name || nodeData.label || "Untitled node";

    if (isHeEntity) {
      const keywords = Array.isArray(nodeData.keywords)
        ? nodeData.keywords.filter(Boolean)
        : [];
      const aliases = Array.isArray(nodeData.aliases)
        ? nodeData.aliases.filter(Boolean)
        : [];
      const sourceDocs = Array.isArray(nodeData.source_documents)
        ? nodeData.source_documents.filter(Boolean)
        : [];

      return {
        kind: "he_entity",
        title,
        entityType: rawType || nodeData.category || "node",
        summary: (nodeData.summary || "").trim(),
        body: (nodeData.body || "").trim(),
        keywords,
        aliases,
        sourceDocs,
        nodeStatus: nodeData.status || "",
      };
    }

    const deadlines = normalizeDeadlines(nodeData);

    const hasDescriptionSections =
      CANONICAL_DESCRIPTION_SECTION_KEYS.some((key) => hasRenderableValue(nodeData[key])) ||
      (Array.isArray(nodeData._description_section_keys) &&
        nodeData._description_section_keys.some((key) => hasRenderableValue(nodeData[key])));

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
      hasDescriptionSections ||
      deadlines.length > 0 ||
      nodeData.opening_date != null ||
      nodeData.award_criteria_scoring_thresholds != null;

    if (isDestination) {
      return { kind: "destination", title, summary: (nodeData.summary || "").trim() };
    }

    if ((source === "he_wiki" || source === "he_2025") && !isCall) {
      const keywords = Array.isArray(nodeData.keywords)
        ? nodeData.keywords.filter(Boolean)
        : [];
      const aliases = Array.isArray(nodeData.aliases)
        ? nodeData.aliases.filter(Boolean)
        : [];
      const sourceDocs = Array.isArray(nodeData.source_documents)
        ? nodeData.source_documents.filter(Boolean)
        : [];

      return {
        kind: "he_entity",
        title,
        entityType: rawType || nodeData.category || "node",
        summary: (nodeData.summary || nodeData.description || "").trim(),
        body: (nodeData.body || "").trim(),
        keywords,
        aliases,
        sourceDocs,
        nodeStatus: nodeData.status || "",
      };
    }

    const typeOfAction = nodeData.type_of_action || "";
    const typeShort = computeTypeShort(typeOfAction);
    const status = inferCallStatus(nodeData, deadlines);
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

  // Resolve [[wikilinks]] in the body against this node's fetched neighbors,
  // so curated/contextual links navigate to the target entity's detail page.
  const wikiResolver = useMemo(() => makeWikiResolver(connectedNodes), [connectedNodes]);

  const renderWikiLink = useCallback(
    (rawInner) => {
      const raw = String(rawInner || "");
      const display =
        (raw.includes("|") ? raw.split("|").slice(1).join("|") : raw.split("#")[0]).trim() ||
        raw.trim();
      const resolved = wikiResolver(raw);
      if (!resolved) return <em>{display}</em>;
      return (
        <a
          href={`/node/${encodeURIComponent(resolved.id)}`}
          onClick={(e) => {
            e.preventDefault();
            localStorage.setItem("graphName", "HE_2025");
            navigate(`/node/${encodeURIComponent(resolved.id)}`, {
              state: { returnGraphName: "HE_2025", graphName: "HE_2025", nodeData: resolved.data },
            });
          }}
          style={{ color: "#4f9dff", textDecoration: "underline", cursor: "pointer" }}
        >
          {display}
        </a>
      );
    },
    [wikiResolver, navigate]
  );

  if (loading || !nodeData || !viewModel) {
    return (
      <div className="nd-loading-wrapper">
        <CircularProgress color="primary" />
      </div>
    );
  }

  if (viewModel.kind === "he_entity") {
    const summaryText = viewModel.summary || "—";
    const sourceText = formatValue("source", nodeData.source || "");
    const entityLabel = viewModel.entityType
      ? viewModel.entityType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "";
    const statusLabel = normalizeStatusLabel(viewModel.nodeStatus);

    const bodyElements = viewModel.body ? renderMarkdownBody(viewModel.body, renderWikiLink) : null;

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
            {entityLabel && <Chip label={entityLabel} size="small" className="nd-chip nd-chip--kind" />}
            {statusLabel && <Chip label={statusLabel} size="small" className="nd-chip nd-chip--status nd-chip--status-open" />}
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

            {viewModel.keywords.length > 0 && (
              <Box className="nd-tags-row">
                {viewModel.keywords.map((kw) => (
                  <Chip key={kw} label={kw} size="small" className="nd-tag-chip" variant="filled" />
                ))}
              </Box>
            )}

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

                {bodyElements && bodyElements.length > 0 && (
                  <CollapsibleSection title="Details" defaultOpen>
                    {bodyElements}
                  </CollapsibleSection>
                )}
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

                {viewModel.aliases.length > 0 && (
                  <Box className="nd-card">
                    <Box className="nd-card-header">
                      <Typography variant="body2" className="nd-card-title nd-muted-label">
                        Also Known As
                      </Typography>
                    </Box>
                    <Box className="nd-card-body nd-card-body--text">
                      {viewModel.aliases.map((a, idx) => (
                        <Typography key={idx} variant="body2" className="nd-paragraph">{a}</Typography>
                      ))}
                    </Box>
                  </Box>
                )}

                {viewModel.sourceDocs.length > 0 && (
                  <Box className="nd-card">
                    <Box className="nd-card-header">
                      <Typography variant="body2" className="nd-card-title nd-muted-label">
                        Source Documents
                      </Typography>
                    </Box>
                    <Box className="nd-card-body nd-card-body--text">
                      {viewModel.sourceDocs.map((doc, idx) => (
                        <Typography key={idx} variant="body2" className="nd-paragraph" sx={{ wordBreak: "break-all" }}>{doc}</Typography>
                      ))}
                    </Box>
                  </Box>
                )}

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
                    <Button
                      fullWidth
                      variant="contained"
                      className="nd-primary-button nd-primary-button--bookmark"
                      onClick={handleBookmarkDestination}
                    >
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
    deadlines,
    openingDate,
    source,
    portalKey,
  } = viewModel;

  const officialCallPageUrl = buildOfficialCallPageUrl(portalKey);
  const statusKey = String(status || "").toLowerCase();
  const statusClass =
    statusKey === "open"
      ? "nd-chip--status-open"
      : statusKey === "forthcoming"
      ? "nd-chip--status-forthcoming"
      : "nd-chip--status-closed";

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
              className={`nd-chip nd-chip--status ${statusClass}`}
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
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  className="nd-tag-chip"
                  variant="filled"
                />              
                ))}
            </Box>
          )}

          <div className="nd-grid">
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
                      <div className="nd-info-row">
                        <div className="nd-info-row-label">
                          <InfoOutlinedIcon fontSize="small" className="nd-info-row-icon" />
                          <span>Type of Action</span>
                        </div>
                        <div className="nd-info-row-value">{typeOfAction}</div>
                      </div>
                    )}

                    {expectedEUContribution && (
                      <div className="nd-info-row">
                        <div className="nd-info-row-label">
                          <EuroIcon fontSize="small" className="nd-info-row-icon" />
                          <span>Expected EU Contribution</span>
                        </div>
                        <div className="nd-info-row-value">{expectedEUContribution}</div>
                      </div>
                    )}

                    {(nodeData.call_identifier || nodeData.programme) && (
                      <div className="nd-info-row">
                        <div className="nd-info-row-label">
                          <InfoOutlinedIcon fontSize="small" className="nd-info-row-icon" />
                          <span>Identifiers</span>
                        </div>
                        <div className="nd-info-row-value">
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

              {viewModel.kind === "call" && (
                <CordisEvidencePanel callId={nodeData.id || id} />
              )}

              {textFieldConfig.map(({ key, label }) => (
                <TextSectionFromField
                  key={key}
                  nodeData={nodeData}
                  fieldKey={key}
                  label={label}
                  defaultOpen={
                    isMobile
                      ? !["description_root", "objective", "expected_outcome", "scope"].includes(key)
                      : ["description_root", "objective", "expected_outcome"].includes(key)
                  }
                />
              ))}

              {hasRenderableValue(nodeData.tags_from_description) && (
                <TextSectionFromField
                  nodeData={nodeData}
                  fieldKey="tags_from_description"
                  label="Tags From Description"
                  defaultOpen={false}
                />
              )}
            </div>

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
                    <Box className="nd-timeline-content">
                      <Typography variant="body2" className="nd-timeline-label">
                        Opening Date
                      </Typography>
                      <Typography variant="caption" className="nd-timeline-date">
                        {formatDateShort(openingDate)}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {deadlines && deadlines.length > 0 && (
                  <Box className="nd-timeline-row">
                    <CalendarTodayIcon fontSize="small" className="nd-timeline-icon" />
                    <Box className="nd-timeline-content">
                      <Typography variant="body2" className="nd-timeline-label">
                        Application Deadline{deadlines.length > 1 ? "s" : ""}
                      </Typography>
                      {deadlines.map((dl, idx) => (
                        <Typography
                          key={`${dl}-${idx}`}
                          variant="caption"
                          className="nd-timeline-date"
                          display="block"
                        >
                          {formatDateShort(dl)}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}

                {officialCallPageUrl && (
                  <Box className="nd-card-action">
                    <Button
                      fullWidth
                      size="medium"
                      variant="contained"
                      className="nd-primary-button nd-primary-button--official"
                      startIcon={<OpenInNewIcon fontSize="small" />}
                      onClick={() =>
                        window.open(officialCallPageUrl, "_blank", "noopener,noreferrer")
                      }
                    >
                      Official Call Page
                    </Button>
                  </Box>
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
                  <Button
                    fullWidth
                    variant="outlined"
                    className="nd-secondary-button nd-secondary-button--bookmark"
                    onClick={handleBookmark}
                  >
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