import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
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
import EuroIcon from "@mui/icons-material/Euro";
import GroupIcon from "@mui/icons-material/Group";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import { useNavigate, useLocation } from "react-router-dom";
import { useDarkMode } from "./context/DarkModeContext";
import "../styles/nodedetails.scss";
import { useNodeDetail } from "./NodeDetalParts/useNodeDetail";
import NodeConnections from "./NodeDetalParts/NodeConnections";
import CordisBand from "./GraphPage/CordisEvidence/CordisBand";
import useCordisEvidence from "./GraphPage/CordisEvidence/useCordisEvidence";
import MoneyBadge from "./common/MoneyBadge";

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

/**
 * An advisor reads a call in four passes: what it funds, whether we can apply, how we apply,
 * and what the rules are. Those four groups were already authored into this list as blank-line
 * runs — and then flattened at render, so thirty identically-shelled sections arrived as one
 * undifferentiated stack in which "Eligibility Conditions" and "Proposal Page Limits" looked
 * exactly alike. The grouping is now data the view can use, not a comment convention.
 *
 * Order within a group is still the reading order; order of groups is the decision order.
 */
const TEXT_SECTION_GROUPS = [
  {
    key: "what",
    label: "What this call funds",
    fields: [
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
    ],
  },
  {
    key: "eligibility",
    label: "Whether you can apply",
    fields: [
      { key: "admissibility_conditions", label: "Admissibility Conditions" },
      { key: "eligibility_conditions", label: "Eligibility Conditions" },
      { key: "eligible_applicants", label: "Eligible Applicants" },
      { key: "eligible_activities", label: "Eligible Activities" },
      { key: "eligible_countries", label: "Eligible Countries" },
      { key: "other_eligibility_conditions", label: "Other Eligibility Conditions" },
      { key: "conditions_for_participation", label: "Conditions For Participation" },
      { key: "financial_and_operational_capacity", label: "Financial & Operational Capacity" },
    ],
  },
  {
    key: "process",
    label: "How to apply",
    fields: [
      { key: "application_procedure", label: "Application Procedure" },
      { key: "submission", label: "Submission" },
      { key: "submission_and_evaluation_process", label: "Submission & Evaluation Process" },
      { key: "evaluation", label: "Evaluation" },
      { key: "award_criteria", label: "Award Criteria" },
      { key: "award_criteria_scoring_thresholds", label: "Award Criteria / Thresholds" },
    ],
  },
  {
    key: "rules",
    label: "Rules and admin",
    fields: [
      { key: "funding_rules", label: "Funding Rules" },
      { key: "implementation", label: "Implementation" },
      { key: "work_programme", label: "Work Programme" },
      { key: "proposal_page_limits_mentions", label: "Proposal Page Limits" },
      { key: "legal_and_financial_setup", label: "Legal and Financial Setup" },
      { key: "additional_information", label: "Additional Information" },
    ],
  },
];

// Flat reading order, derived — never hand-maintained alongside the groups.
const baseTextFieldConfig = TEXT_SECTION_GROUPS.flatMap((g) => g.fields);

// The three sections that answer "what is this" open on arrival; everything else waits to be
// asked for. One set, used at every breakpoint — the mobile branch used to be this list negated,
// which collapsed the four sections that matter and expanded the twenty-odd that don't.
const OPEN_BY_DEFAULT = new Set(["description_root", "objective", "expected_outcome"]);

// These keys are in labelMap because they are rendered as *metadata* elsewhere on the page —
// the decision header, the Key information card. A dynamic section must never restate one of
// them as a long-form card.
const NON_SECTION_KEYS = new Set([
  "funding_link",
  "expected_eu_contribution",
  "indicative_budget",
  "indicative_number_of_projects",
  "max_funded_projects",
  "deadline",
  "deadlines",
  "trl",
  "source",
  "call_id",
  "identifier",
  "topic_id",
  "call_identifier",
  "min_contribution",
  "max_contribution",
  "type_of_action",
  "opening_date",
  "tags_from_description",
]);

function hasRenderableValue(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.some((v) => String(v ?? "").trim());
  if (typeof value === "object") return Object.keys(value).length > 0;
  return String(value).trim() !== "";
}

// Day-month-year: the audience is European and the surface is deadline-critical, so the
// ambiguous US ordering earns nothing here.
function formatDateShort(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDynamicDescriptionSectionConfig(nodeData) {
  const advertised = Array.isArray(nodeData?._description_section_keys)
    ? nodeData._description_section_keys.filter((k) => typeof k === "string" && k.trim())
    : [];

  const existingKeys = new Set(baseTextFieldConfig.map((f) => f.key));
  // tags_from_description is now surfaced (provenance-aware) by the top chip row;
  // never re-render it as a dynamic description section (would duplicate the chips).
  existingKeys.add("tags_from_description");
  const dynamic = [];

  for (const key of advertised) {
    if (existingKeys.has(key) || NON_SECTION_KEYS.has(key)) continue;
    // A heading has to be something the work programme actually calls this. formatLabel's
    // fallback Title-Cases whatever column name the record happens to carry, which shipped the
    // database schema to the user as a section title. An unmapped key gets no section — the
    // fix is to name it in labelMap, not to dress the column up as a heading.
    if (!labelMap[key]) continue;
    if (!hasRenderableValue(nodeData?.[key])) continue;
    dynamic.push({ key, label: labelMap[key] });
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
    // Leading symbol, as everywhere else on the page. The header's compact read (€12.0M) and
    // this card's exact figure (€12,000,000) used to disagree about where the € goes, which
    // left the reader checking whether two euro figures ~700px apart were the same number.
    // Precision stays here; only the notation is unified.
    //
    // The locale is pinned for the same reason the dates are (see formatDateShort): an
    // unpinned toLocaleString groups by the *browser's* locale, so the same call rendered
    // "€35 000 000" here and "€35.0M" in the header on any non-English machine.
    if (Number.isFinite(num)) return `€${num.toLocaleString("en-GB")}`;
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

// Only ever the figure the work programme actually states. This used to fall back to
// budget ÷ expected-EU-contribution when the field was absent, which invented a number the
// work programme never published and presented it as one of its facts — ADR-0006 #1 admits
// no extrapolation. Absent stays absent.
function computeIndicativeNumberOfProjects(nodeData) {
  const val = nodeData.indicative_number_of_projects;
  if (val == null) return null;

  const num = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function extractTags(nodeData) {
  // Provenance-aware and NON-merging. CORDIS-tagged calls carry EuroSciVoc
  // research fields (the tagger overwrites related_topics/keywords and stamps
  // cordis_tag_source); everything else is native work-programme keyword data
  // (tags_from_description / keywords). Pick ONE source so the chip row can be
  // labelled accurately and is no longer duplicated by the tags_from_description card.
  const isCordisFields =
    hasRenderableValue(nodeData.cordis_tag_source) ||
    hasRenderableValue(nodeData.related_topics);

  const candidates = isCordisFields
    ? nodeData.related_topics || nodeData.keywords
    : nodeData.tags_from_description ||
      nodeData.keywords ||
      nodeData.tags ||
      nodeData.themes;

  let list = [];
  if (Array.isArray(candidates)) {
    list = candidates.map((t) => String(t)).filter(Boolean).slice(0, 6);
  } else if (typeof candidates === "string") {
    list = candidates
      .split(/[;,]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  return {
    tags: list,
    provenance: list.length ? (isCordisFields ? "fields" : "keywords") : null,
  };
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

// `deadlines: ["2026-09-23"]` and `deadline: "2026-09-23T00:00:00+00:00"` are the same day in
// two encodings, so de-duplicating the raw strings let one deadline render twice — which on a
// two-stage call is a false signal about the submission model. Key on the calendar day.
function normalizeDeadlines(nodeData) {
  const arr = Array.isArray(nodeData.deadlines) ? nodeData.deadlines.filter(Boolean) : [];
  const single = nodeData.deadline ? [String(nodeData.deadline)] : [];
  const merged = [...arr, ...single].map((x) => String(x)).filter(Boolean);

  const seen = new Set();
  const out = [];
  for (const raw of merged) {
    const parsed = parseValidDate(raw);
    const key = parsed ? parsed.toISOString().slice(0, 10) : raw.trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
  }
  return out;
}

// --- UI helpers -------------------------------------------------------------

let collapsibleSeq = 0;

// Every section used to be a <p> with a "Show" button next to it, which left the page with one
// heading, no outline, and a run of eleven identical tab stops all announced as "Show". The title
// is now a real heading, the toggle names the section it governs, and the two are associated.
const CollapsibleSection = ({
  title,
  sectionId,
  titleLevel = "h2",
  defaultOpen = true,
  openSignal,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [fallbackId] = useState(() => `nd-sec-${(collapsibleSeq += 1)}`);
  const domId = sectionId || fallbackId;
  const bodyRef = useRef(null);

  // Expand all / Collapse all drives every section from one control without taking ownership of
  // each section's state: the signal carries a sequence number and only acts when it changes, so
  // a section the reader opened by hand stays open until the next explicit all-command.
  const seq = openSignal?.seq;
  const signalOpen = openSignal?.open;
  useEffect(() => {
    if (seq == null) return;
    setOpen(!!signalOpen);
  }, [seq, signalOpen]);

  // Collapsed bodies used to be unmounted, which meant browser find-in-page could not reach the
  // paragraph that decides whether a consortium is eligible — on a page whose whole job is
  // helping someone find exactly that. They stay in the DOM now as `hidden="until-found"`:
  // findable, and revealed by the browser when a match lands inside. React is deliberately not
  // given the attribute (it would coerce the string to a bare boolean), and browsers without
  // support treat any value as plain `hidden`, which is precisely the previous behaviour.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (open) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "until-found");
  }, [open]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return undefined;
    const reveal = () => setOpen(true);
    el.addEventListener("beforematch", reveal);
    return () => el.removeEventListener("beforematch", reveal);
  }, []);

  if (!children) return null;

  const Title = titleLevel;

  return (
    <Box
      className="nd-card nd-section"
      component="section"
      id={domId}
      aria-labelledby={`${domId}-title`}
    >
      <Box className="nd-card-header nd-card-header--collapsible">
        <Typography
          variant="body2"
          component={Title}
          id={`${domId}-title`}
          className="nd-card-title nd-muted-label"
        >
          {title}
        </Typography>
        <Button
          size="small"
          variant="text"
          className="nd-card-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={`${domId}-body`}
          aria-label={`${open ? "Hide" : "Show"} ${title}`}
        >
          {open ? "Hide" : "Show"}
        </Button>
      </Box>
      <Box
        ref={bodyRef}
        id={`${domId}-body`}
        className="nd-card-body nd-card-body--text"
      >
        {children}
      </Box>
    </Box>
  );
};

/**
 * Build the four reading groups against one record: which sections this call actually carries,
 * in reading order, each with a stable anchor id. A group the work programme says nothing about
 * keeps its place with an empty entry list — the index turns that into "not stated", so the
 * reader can tell *missing* from *collapsed*, which thirty identical closed shells could not.
 */
function buildSectionGroups(nodeData) {
  if (!nodeData) return [];
  const dynamic = getDynamicDescriptionSectionConfig(nodeData);

  return TEXT_SECTION_GROUPS.map((group) => {
    const fields = group.key === "rules" ? [...group.fields, ...dynamic] : group.fields;
    const entries = [];

    for (const field of fields) {
      if (!hasRenderableValue(nodeData[field.key])) continue;
      const items = toListItems(nodeData[field.key]);
      if (items.length === 0) continue;
      entries.push({
        key: field.key,
        label: field.label || formatLabel(field.key),
        domId: `nd-sec-${field.key}`,
        items,
      });
    }

    return { key: group.key, label: group.label, entries };
  });
}

/**
 * The jump list. It occupies the sidebar column on wide screens — which previously sat empty
 * for the full height of the page beside the section stack — and rides above the stack on
 * narrower ones, where there is no second column to put it in.
 */
function CallSectionIndex({ groups, variant }) {
  const populated = groups.filter((g) => g.entries.length > 0);
  if (populated.length === 0) return null;

  return (
    <nav className={`nd-secindex nd-secindex--${variant}`} aria-label="Call sections">
      {groups.map((group) => (
        <div key={group.key} className="nd-secindex__group">
          <div className="nd-secindex__group-label">{group.label}</div>
          {group.entries.length > 0 ? (
            <ul className="nd-secindex__list">
              {group.entries.map((entry) => (
                <li key={entry.key}>
                  <a className="nd-secindex__link" href={`#${entry.domId}`}>
                    {entry.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="nd-secindex__absent">Not stated in the work programme.</p>
          )}
        </div>
      ))}
    </nav>
  );
}

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

// --- Call decision header ---------------------------------------------------

// Same € formatter as the CORDIS panels — counts and euros are never mixed.
function formatBudget(val) {
  if (val >= 1e9) return `€${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `€${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `€${(val / 1e3).toFixed(0)}K`;
  if (val > 0) return `€${val.toLocaleString()}`;
  return "—";
}

function toNumber(value) {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function startOfDay(date) {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86400000);
}

function getNextDeadline(deadlines = [], now = new Date()) {
  return deadlines
    .map(parseValidDate)
    .filter(Boolean)
    .filter((d) => daysBetween(now, d) >= 0)
    .sort((a, b) => a.getTime() - b.getTime())[0] || null;
}

/**
 * The time read the whole decision turns on: not "Sep 23, 2026" but "how long have I got".
 * Derived only from dates the work programme states — it reports remaining time, it does not
 * rate the call's chances (ADR-0002 #4: no verdicts).
 *
 * `urgent` is a typographic signal for "less than a month left", and is never the only channel:
 * the sentence itself says how many days.
 */
function describeCallTiming(nodeData, deadlines, status, now = new Date()) {
  const opening = parseValidDate(nodeData?.opening_date);
  const next = getNextDeadline(deadlines, now);

  if (status === "Forthcoming" && opening) {
    const days = daysBetween(now, opening);
    return {
      text:
        days === 0
          ? `Opens today · ${formatDateShort(opening)}`
          : `Opens in ${days} day${days === 1 ? "" : "s"} · ${formatDateShort(opening)}`,
      urgent: false,
    };
  }

  if (next) {
    const days = daysBetween(now, next);
    return {
      text:
        days === 0
          ? `Closes today · ${formatDateShort(next)}`
          : `Closes in ${days} day${days === 1 ? "" : "s"} · ${formatDateShort(next)}`,
      urgent: days <= 30,
    };
  }

  const last = getLatestDeadline(deadlines);
  if (last) return { text: `Closed ${formatDateShort(last)}`, urgent: false };
  return null;
}

/**
 * Where this call sits in the work programme — the structure that the flat official portal
 * cannot show, and which was previously reachable only as a truncated link in a sidebar card.
 * Every level comes from data already on the node or from the HAS_CALL edge; nothing is inferred.
 */
function buildProgrammeTrail({ nodeData, relations, connectedNodes }) {
  const trail = [];
  const ownName = String(nodeData?.name || "").trim().toLowerCase();
  // A step that just repeats the title (some records carry call_title === name) is noise, and
  // so is a level repeated twice.
  const push = (value) => {
    const text = String(value || "").trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (key === ownName) return;
    if (trail.some((t) => t.toLowerCase() === key)) return;
    trail.push(text);
  };

  const source = formatValue("source", nodeData?.source || "");
  if (source !== "—") push(source);

  const parentId = (Array.isArray(relations) ? relations : []).find(
    (r) => r?.target === nodeData?.id && String(r?.type || "").toUpperCase() === "HAS_CALL"
  )?.source;
  push(
    (parentId && connectedNodes?.[parentId]?.name) ||
      (typeof nodeData?.group_value === "string" ? nodeData.group_value : "")
  );

  const parentCall = [nodeData?.call_identifier, nodeData?.call_title]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .filter((x) => x.toLowerCase() !== ownName);
  push(parentCall.join(" · "));

  return trail;
}

/**
 * One euro tile in the Key information grid. The badge and the half's colour belong to a
 * *figure*: an absent one gets neither, because stamping "Indicative · on offer" on an em-dash
 * labels nothing. Absent also reads "Not stated" rather than "—", so one grid stops using two
 * notations for one condition.
 */
function MoneyMetric({ label, value, present }) {
  return (
    <div className={`nd-metric${present ? " nd-metric--advertised" : ""}`}>
      <div className="nd-metric-label">
        <EuroIcon fontSize="small" className="nd-metric-icon" />
        <span>{label}</span>
        {present && <MoneyBadge kind="advertised" size="sm" />}
      </div>
      <div className={`nd-metric-value${present ? "" : " nd-metric-value--absent"}`}>
        {present ? value : "Not stated"}
      </div>
    </div>
  );
}

function StatusPill({ status, statusKey }) {
  if (!status) return null;
  // The dot's shape (filled / hollow / barred) repeats what the word says, so the state never
  // rides on hue alone.
  return (
    <span className={`nd-status nd-status--${statusKey || "unknown"}`}>
      <span className="nd-status__dot" aria-hidden="true" />
      {status}
    </span>
  );
}

/**
 * The decision header: everything needed to judge "is this worth committing to" before any
 * scrolling — where it sits, what it is, how long is left, what is on offer, and the one
 * primary action. The awarded half is deliberately NOT restated here; it lives in the evidence
 * band directly below, which owns the "in this area" qualifier (ADR-0001).
 */
function CallDecisionHeader({
  viewModel,
  nodeData,
  trail,
  timing,
  officialCallPageUrl,
  bookmarked,
  onBookmark,
  announcement,
}) {
  const {
    title,
    status,
    statusKey,
    typeOfAction,
    portalKey,
    indicativeProjects,
    minContributionNum,
    maxContributionNum,
    totalBudgetNum,
    deadlines,
  } = viewModel;

  const openingDate = nodeData?.opening_date;

  // A closed call's advertised half is history and its portal page cannot be applied to, so the
  // header stops ranking them as if the decision were still live. What the reader wants from a
  // closed topic is the other half — who won this, is there a successor — which the evidence
  // band below opens on arrival for exactly this state. The figures are not hidden or restated;
  // only their rank and tense change.
  const isClosed = statusKey === "closed";
  const isForthcoming = statusKey === "forthcoming";

  const offerTitle = isClosed ? "Was on offer" : "On offer";
  const officialLabel = isClosed
    ? "View the archived topic page"
    : isForthcoming
    ? "Preview on the official portal"
    : "Official call page";
  const officialAria = isClosed
    ? "View the archived topic page on the EU Funding & Tenders portal (opens in a new tab)"
    : isForthcoming
    ? "Preview this topic on the EU Funding & Tenders portal (opens in a new tab)"
    : "Open the official call page on the EU Funding & Tenders portal (opens in a new tab)";

  const contributionRange =
    minContributionNum != null && maxContributionNum != null
      ? minContributionNum === maxContributionNum
        ? formatBudget(minContributionNum)
        : `${formatBudget(minContributionNum)} – ${formatBudget(maxContributionNum)}`
      : minContributionNum != null
      ? `From ${formatBudget(minContributionNum)}`
      : maxContributionNum != null
      ? `Up to ${formatBudget(maxContributionNum)}`
      : null;

  return (
    <section className="nd-callhead" aria-labelledby="nd-call-title">
      {trail.length > 0 && (
        <nav className="nd-callhead__trail" aria-label="Work programme location">
          {trail.map((step, i) => (
            <React.Fragment key={`${step}-${i}`}>
              {i > 0 && <span className="nd-callhead__trail-sep" aria-hidden="true">›</span>}
              <span className="nd-callhead__trail-step">{step}</span>
            </React.Fragment>
          ))}
        </nav>
      )}

      <h1 id="nd-call-title" className="nd-callhead__title">
        {title}
      </h1>

      <div className="nd-callhead__identity">
        {portalKey && <span className="nd-callhead__topic">{portalKey}</span>}
        {typeOfAction && <span className="nd-callhead__type">{typeOfAction}</span>}
      </div>

      <div className="nd-callhead__state">
        <StatusPill status={status} statusKey={statusKey} />
        {timing && (
          <span
            className={`nd-callhead__timing${
              timing.urgent ? " nd-callhead__timing--urgent" : ""
            }`}
          >
            {timing.text}
          </span>
        )}
      </div>

      <div className="nd-callhead__halves">
        <div
          className={`nd-callhead__half nd-callhead__half--offer${
            isClosed ? " nd-callhead__half--past" : ""
          }`}
        >
          <div className="nd-callhead__half-head">
            <h2 className="nd-callhead__half-title">{offerTitle}</h2>
            {/* The badge names the half, not the tense — it stays the one constant string so the
                advertised/awarded vocabulary never forks per state (ADR-0006 #5). */}
            <MoneyBadge kind="advertised" />
          </div>
          <dl className="nd-callhead__facts">
            {totalBudgetNum != null && (
              <div className="nd-callhead__fact">
                <dt>Indicative budget on offer</dt>
                <dd>{formatBudget(totalBudgetNum)}</dd>
              </div>
            )}
            {contributionRange && (
              <div className="nd-callhead__fact">
                <dt>EU contribution per project</dt>
                <dd>{contributionRange}</dd>
              </div>
            )}
            {indicativeProjects != null && (
              <div className="nd-callhead__fact">
                <dt>Projects expected</dt>
                <dd>{indicativeProjects.toLocaleString()}</dd>
              </div>
            )}
            {totalBudgetNum == null && !contributionRange && indicativeProjects == null && (
              <div className="nd-callhead__fact nd-callhead__fact--empty">
                <dd>The work programme states no budget figures for this call.</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="nd-callhead__half nd-callhead__half--time">
          <div className="nd-callhead__half-head">
            <h2 className="nd-callhead__half-title">Timeline</h2>
          </div>
          <dl className="nd-callhead__facts">
            {openingDate && (
              <div className="nd-callhead__fact">
                <dt>Opens</dt>
                <dd>{formatDateShort(openingDate)}</dd>
              </div>
            )}
            {deadlines.length > 0 ? (
              <div className="nd-callhead__fact">
                <dt>{deadlines.length > 1 ? "Deadlines" : "Deadline"}</dt>
                <dd>
                  {deadlines.map((dl, idx) => (
                    <span key={`${dl}-${idx}`} className="nd-callhead__date">
                      {formatDateShort(dl)}
                    </span>
                  ))}
                </dd>
              </div>
            ) : (
              !openingDate && (
                <div className="nd-callhead__fact nd-callhead__fact--empty">
                  <dd>No dates published for this call yet.</dd>
                </div>
              )
            )}
          </dl>
        </div>
      </div>

      <div className="nd-callhead__actions">
        {officialCallPageUrl && (
          <Button
            className={`nd-cta ${isClosed ? "nd-cta--secondary" : "nd-cta--primary"}`}
            startIcon={<OpenInNewIcon fontSize="small" />}
            aria-label={officialAria}
            onClick={() => window.open(officialCallPageUrl, "_blank", "noopener,noreferrer")}
          >
            {officialLabel}
          </Button>
        )}
        <Button
          className="nd-cta nd-cta--secondary"
          startIcon={
            bookmarked ? (
              <BookmarkIcon fontSize="small" />
            ) : (
              <BookmarkBorderIcon fontSize="small" />
            )
          }
          aria-pressed={bookmarked}
          aria-label={bookmarked ? "Bookmarked — already saved" : "Bookmark this call"}
          onClick={onBookmark}
        >
          {bookmarked ? "Bookmarked" : "Bookmark"}
        </Button>
        <span className="nd-callhead__announce" role="status">
          {announcement}
        </span>
      </div>
    </section>
  );
}

// --- main component ---------------------------------------------------------

function NodeDetail({ embeddedId, embeddedNodeData, onBack, onOpenResearchFields }) {
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();

  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("md"));

  const { id, nodeData, relations, connectedNodes, loading } = useNodeDetail({
    idOverride: embeddedId,
    initialNodeData: embeddedNodeData,
  });

  const sectionGroups = useMemo(() => buildSectionGroups(nodeData), [nodeData]);

  // One control over the whole stack. The sequence number is what the sections react to, so
  // pressing the same command twice still re-applies it.
  // Null until the reader actually uses the control: a signal that exists on mount would
  // override every section's own default the moment it rendered.
  const [sectionSignal, setSectionSignal] = useState(null);
  const [allExpanded, setAllExpanded] = useState(false);
  const toggleAllSections = useCallback(() => {
    setAllExpanded((wasExpanded) => {
      const next = !wasExpanded;
      setSectionSignal((s) => ({ open: next, seq: (s?.seq ?? 0) + 1 }));
      return next;
    });
  }, []);

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
    const statusKey = String(status || "").toLowerCase() || "unknown";
    const { tags, provenance: tagsProvenance } = extractTags(nodeData);

    const minContribution = formatValue("min_contribution", nodeData.min_contribution);
    const maxContribution = formatValue("max_contribution", nodeData.max_contribution);
    const totalBudget = formatValue("indicative_budget", nodeData.indicative_budget);
    const indicativeProjects = computeIndicativeNumberOfProjects(nodeData);

    // Raw numbers for the header's compact reads; the Key Information card keeps the exact,
    // fully-written figures so precision is never lost, only re-ranked.
    const minContributionNum = toNumber(nodeData.min_contribution);
    const maxContributionNum = toNumber(nodeData.max_contribution);
    const totalBudgetNum = toNumber(nodeData.indicative_budget);

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
      statusKey,
      tags,
      tagsProvenance,
      minContribution,
      maxContribution,
      totalBudget,
      minContributionNum,
      maxContributionNum,
      totalBudgetNum,
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

  const cordisEvidence = useCordisEvidence(viewModel?.kind === "call" ? (nodeData?.id || id) : null);

  // The bookmark used to be write-only: it wrote to localStorage, announced itself through a
  // native alert(), and then looked exactly the same on return, so a returning advisor could not
  // tell whether the call was already saved. Same mechanism, now with state and a quiet
  // in-place confirmation.
  const bookmarkId = nodeData?.id || id || null;
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState("");

  useEffect(() => {
    if (!bookmarkId) return;
    const read = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("bookmarkedCalls") || "[]");
        setBookmarked(
          Array.isArray(stored) && stored.some((item) => item?.id === bookmarkId)
        );
      } catch (err) {
        setBookmarked(false);
      }
    };
    read();
    window.addEventListener("bookmarksChanged", read);
    return () => window.removeEventListener("bookmarksChanged", read);
  }, [bookmarkId]);

  const handleBookmark = useCallback(() => {
    if (!bookmarkId) return;
    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem("bookmarkedCalls") || "[]");
    } catch (err) {
      stored = [];
    }
    if (!Array.isArray(stored)) stored = [];

    if (stored.some((item) => item?.id === bookmarkId)) {
      setBookmarkNote("Already bookmarked.");
      return;
    }

    stored.push({ id: bookmarkId, name: nodeData?.name });
    localStorage.setItem("bookmarkedCalls", JSON.stringify(stored));
    window.dispatchEvent(new Event("bookmarksChanged"));
    setBookmarked(true);
    setBookmarkNote("Bookmarked.");
  }, [bookmarkId, nodeData?.name]);

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
          className="nd-wikilink"
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
              Back
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
              Back
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
              </aside>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const {
    typeOfAction,
    status,
    tags,
    tagsProvenance,
    minContribution,
    maxContribution,
    totalBudget,
    indicativeProjects,
    trlText,
    expectedEUContribution,
    deadlines,
    portalKey,
  } = viewModel;

  const officialCallPageUrl = buildOfficialCallPageUrl(portalKey);
  const programmeTrail = buildProgrammeTrail({ nodeData, relations, connectedNodes });
  const timing = describeCallTiming(nodeData, deadlines, status);

  // Field chips are only a control where something is actually wired to them (the embedded view
  // passes a handler). On the standalone route nothing is, so they render as plain metadata
  // rather than as the most CTA-shaped object on the page — ADR-0006 #2: an inert control lies
  // about what interacting will do.
  const fieldsAreNavigable =
    tagsProvenance === "fields" && typeof onOpenResearchFields === "function";

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
            aria-label="Back to the funding map"
          >
            Back
          </Button>
        </Box>
      </header>

      <main className="nd-main">
        <div className="nd-main-inner">
          <CallDecisionHeader
            viewModel={viewModel}
            nodeData={nodeData}
            trail={programmeTrail}
            timing={timing}
            officialCallPageUrl={officialCallPageUrl}
            bookmarked={bookmarked}
            onBookmark={handleBookmark}
            announcement={bookmarkNote}
          />

          <div className="nd-grid">
            <div className="nd-main-column" style={isMobile ? { order: 1 } : undefined}>
              {/* The awarded half sits first in the column so it is adjacent to the on-offer half
                  in the decision header — the two halves read together, which is the whole point
                  of the join (ADR-0001). */}
              {viewModel.kind === "call" && (
                <CordisBand
                  callId={nodeData.id || id}
                  evidence={cordisEvidence}
                  // On a closed call the awarded half is the page's primary content, so it
                  // arrives open rather than behind a toggle.
                  defaultOpen={viewModel.statusKey === "closed"}
                />
              )}

              {tags.length > 0 && (
                <Box className="nd-tags-section">
                  <Typography
                    variant="caption"
                    className="nd-muted-label nd-tags-label"
                    component="h2"
                  >
                    {tagsProvenance === "fields"
                      ? "Research fields (CORDIS · EuroSciVoc)"
                      : "Keywords (work programme)"}
                  </Typography>
                  <Box className="nd-tags-row">
                    {tags.map((tag) =>
                      fieldsAreNavigable ? (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          className="nd-tag-chip nd-tag-chip--action"
                          variant="filled"
                          onClick={() => onOpenResearchFields(tag)}
                          clickable
                          aria-label={`Explore the research field ${tag}`}
                        />
                      ) : (
                        <span key={tag} className="nd-tag-chip nd-tag-chip--static">
                          {tag}
                        </span>
                      )
                    )}
                  </Box>
                </Box>
              )}

              <Box className="nd-card" component="section" aria-labelledby="nd-keyinfo-title">
                <Box
                  className="nd-card-header"
                  sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
                >
                  <Typography
                    variant="body2"
                    component="h2"
                    id="nd-keyinfo-title"
                    className="nd-card-title nd-muted-label"
                  >
                    Key information
                  </Typography>
                  {/* The budget figures below (contributions, total budget, expected EU
                      contribution) are the work programme's indicative amounts on offer — never
                      awarded euros (ADR-0006 #5). Stamp the group so no figure is mistaken for
                      the CORDIS awarded half. */}
                  <MoneyBadge kind="advertised" />
                </Box>

                <Box className="nd-card-body">
                  {/* Every euro tile carries its own badge, not just the card header. A figure
                      that can be screenshotted or copied out of its group has to travel with
                      its half — an awarded tile and an advertised tile were previously the same
                      component, distinguishable only by which card you had scrolled to. */}
                  <div className="nd-metrics-grid">
                    <MoneyMetric
                      label="Minimum EU contribution per project"
                      value={minContribution}
                      present={hasRenderableValue(nodeData.min_contribution)}
                    />

                    <MoneyMetric
                      label="Maximum EU contribution per project"
                      value={maxContribution}
                      present={hasRenderableValue(nodeData.max_contribution)}
                    />

                    {/* Q6.2 / ADR-0006 #5: this is money on offer, never money committed. */}
                    <MoneyMetric
                      label="Indicative budget on offer"
                      value={totalBudget}
                      present={hasRenderableValue(nodeData.indicative_budget)}
                    />

                    {/* A count, not euros — it wears no money badge, because counts, funding and
                        impact are different measures (ADR-0006 #3). */}
                    <div
                      className={`nd-metric${
                        indicativeProjects != null ? " nd-metric--advertised" : ""
                      }`}
                    >
                      <div className="nd-metric-label">
                        <GroupIcon fontSize="small" className="nd-metric-icon" />
                        <span>Indicative number of projects</span>
                      </div>
                      <div
                        className={`nd-metric-value${
                          indicativeProjects == null ? " nd-metric-value--absent" : ""
                        }`}
                      >
                        {indicativeProjects != null ? indicativeProjects.toLocaleString("en-GB") : "Not stated"}
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
                <Box className="nd-card" component="section" aria-labelledby="nd-trl-title">
                  <Box className="nd-card-header">
                    <Typography
                      variant="body2"
                      component="h2"
                      id="nd-trl-title"
                      className="nd-card-title nd-muted-label"
                    >
                      Technology readiness level
                    </Typography>
                  </Box>
                  <Box className="nd-card-body nd-card-body--text">
                    <Typography variant="body2" className="nd-paragraph">
                      {trlText}
                    </Typography>
                  </Box>
                </Box>
              )}

              {sectionGroups.some((g) => g.entries.length > 0) && (
                <div className="nd-sections">
                  <div className="nd-sections__bar">
                    <Button
                      size="small"
                      variant="text"
                      className="nd-sections__toggle-all"
                      onClick={toggleAllSections}
                      aria-label={
                        allExpanded
                          ? "Collapse all call sections"
                          : "Expand all call sections"
                      }
                    >
                      {allExpanded ? "Collapse all" : "Expand all"}
                    </Button>
                    {/* Below the two-column breakpoint the sidebar reflows underneath this
                        column, so the jump list rides here instead of arriving after the very
                        content it indexes. */}
                    <CallSectionIndex groups={sectionGroups} variant="inline" />
                  </div>

                  {sectionGroups
                    .filter((group) => group.entries.length > 0)
                    .map((group) => (
                      <section
                        key={group.key}
                        className="nd-section-group"
                        aria-labelledby={`nd-secgroup-${group.key}`}
                      >
                        <h2
                          id={`nd-secgroup-${group.key}`}
                          className="nd-section-group__title"
                        >
                          {group.label}
                        </h2>
                        {group.entries.map((entry) => (
                          <CollapsibleSection
                            key={entry.key}
                            sectionId={entry.domId}
                            title={entry.label}
                            titleLevel="h3"
                            defaultOpen={OPEN_BY_DEFAULT.has(entry.key)}
                            openSignal={sectionSignal}
                          >
                            {entry.items.map((item, idx) => (
                              <Typography
                                key={idx}
                                variant="body2"
                                className="nd-paragraph"
                              >
                                {item}
                              </Typography>
                            ))}
                          </CollapsibleSection>
                        ))}
                      </section>
                    ))}
                </div>
              )}
            </div>

            {/* Timeline, the primary action and the bookmark used to live here, which is why at
                1024px — where this column reflows below a long main column — the apply link
                landed at 82% page depth. They belong to the decision, so they moved into the
                header and are not restated. The "Source: Cluster N" card went with them: the
                same fact now opens the programme trail, and its old label collided with the
                evidence band's "Source: EU CORDIS". */}
            <aside
              className="nd-sidebar"
              aria-label="Call reference"
              style={isMobile ? { order: 2 } : undefined}
            >
              <Box className="nd-card" component="section" aria-labelledby="nd-connections-title">
                <Box className="nd-card-header nd-card-header--with-icon">
                  <Typography
                    variant="body2"
                    component="h2"
                    id="nd-connections-title"
                    className="nd-card-title nd-muted-label"
                  >
                    Connections
                  </Typography>
                  <InfoOutlinedIcon fontSize="small" className="nd-card-header-icon" />
                </Box>
                <Box className="nd-card-body nd-card-body--connections">
                  <NodeConnections id={id} relations={relations} connectedNodes={connectedNodes} bare />
                </Box>
              </Box>

              {/* This column stood empty for the whole height of the page beside a stack of
                  thirty sections. It now holds the map of that stack — and only when there is a
                  stack to map. */}
              {sectionGroups.some((g) => g.entries.length > 0) && (
              <Box
                className="nd-card nd-secindex-card"
                component="section"
                aria-labelledby="nd-secindex-title"
              >
                <Box className="nd-card-header">
                  <Typography
                    variant="body2"
                    component="h2"
                    id="nd-secindex-title"
                    className="nd-card-title nd-muted-label"
                  >
                    On this page
                  </Typography>
                </Box>
                <Box className="nd-card-body nd-card-body--text">
                  <CallSectionIndex groups={sectionGroups} variant="rail" />
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