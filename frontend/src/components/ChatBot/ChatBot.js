// ChatBot.js  –  Redesigned AI search panel (centered modal)
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  IconButton,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import { useDarkMode } from "../context/DarkModeContext";

/* ── Lightweight markdown-to-JSX renderer (no external deps) ──── */
function renderInline(text) {
  // bold **x** or __x__, italic *x* or _x_, inline code `x`, links [t](u)
  const parts = [];
  const re = /(\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`(.+?)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] || m[3])      parts.push(<strong key={m.index}>{m[2] || m[3]}</strong>);
    else if (m[4] || m[5]) parts.push(<em key={m.index}>{m[4] || m[5]}</em>);
    else if (m[6])         parts.push(<code key={m.index}>{m[6]}</code>);
    else if (m[7])         parts.push(<a key={m.index} href={m[8]} target="_blank" rel="noopener noreferrer">{m[7]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function MarkdownContent({ text }) {
  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table: detect header row with | separators, followed by |---|
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\|?\s*[-:]+[-|\s:]+$/.test(lines[i + 1])
    ) {
      const parseRow = (r) =>
        r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const headers = parseRow(line);
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      elements.push(
        <div key={`tbl-${i}`} className="chatbot-table-wrap">
          <table>
            <thead>
              <tr>{headers.map((h, j) => <th key={j}>{renderInline(h)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => <td key={ci}>{renderInline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Heading
    const hMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (hMatch) {
      const Tag = `h${hMatch[1].length}`;
      elements.push(<Tag key={i}>{renderInline(hMatch[2])}</Tag>);
      i++;
      continue;
    }

    // Unordered list item
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`}>{items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ul>
      );
      continue;
    }

    // Ordered list item
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`}>{items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ol>
      );
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      elements.push(<hr key={i} />);
      i++;
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph (collect consecutive non-special lines)
    const pLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !/^#{1,4}\s+/.test(lines[i]) &&
      !/^[-*_]{3,}\s*$/.test(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && /^\|?\s*[-:]+[-|\s:]+$/.test(lines[i + 1]))
    ) {
      pLines.push(lines[i]);
      i++;
    }
    elements.push(<p key={`p-${i}`}>{renderInline(pLines.join(" "))}</p>);
  }

  return <>{elements}</>;
}

const ChatBot = ({ onOpenDetail }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [matchedCalls, setMatchedCalls] = useState([]);
  const [filters, setFilters] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef(null);

  const { darkMode } = useDarkMode();

  const API_BASE = useMemo(() => {
    const base = process.env.REACT_APP_API_URL || "";
    return base.replace(/\/+$/, "");
  }, []);

  // Focus input when panel opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 120);
    }
  }, [open]);

  const handleSearch = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setHasSearched(true);
    setAnswer("");
    setMatchedCalls([]);
    setFilters([]);
    setTotalMatches(0);

    try {
      const res = await fetch(`${API_BASE}/chatbot/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = await res.json();
      setAnswer(data?.answer ?? "");
      setMatchedCalls(data?.matched_calls ?? []);
      setFilters(data?.filters ?? []);
      setTotalMatches(data?.total_matches ?? 0);
    } catch {
      setAnswer("Error contacting the AI search service.");
      setMatchedCalls([]);
      setFilters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const handleCardClick = (call) => {
    if (onOpenDetail) {
      onOpenDetail({
        id: call.identifier,
        nodeData: {
          id: call.identifier,
          label: call.title,
          type: "Call",
          category: "Call",
          identifier: call.identifier,
          title: call.title,
          deadline: call.deadline,
          url: call.url,
        },
      });
      setOpen(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleReset = () => {
    setInput("");
    setAnswer("");
    setMatchedCalls([]);
    setFilters([]);
    setTotalMatches(0);
    setHasSearched(false);
  };

  const themeClass = darkMode ? "chatbot--dark" : "chatbot--light";

  // FAB trigger button
  if (!open) {
    return (
      <Box className={`chatbot-fab-wrap ${themeClass}`}>
        <IconButton
          className="chatbot__fab"
          onClick={() => setOpen(true)}
          aria-label="Open AI search"
        >
          <AutoAwesomeIcon className="chatbot__fabIcon" />
        </IconButton>
      </Box>
    );
  }

  // Main panel
  return (
    <div className={`chatbot-overlay ${themeClass}`} onClick={handleClose}>
      <div
        className="chatbot-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <IconButton
          className="chatbot-panel__close"
          onClick={handleClose}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        {/* Search input */}
        <div className="chatbot-panel__search">
          <TextField
            inputRef={inputRef}
            fullWidth
            size="small"
            variant="outlined"
            placeholder="climate calls in cluster 5 with deadlines after Sept 2026"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AutoAwesomeIcon className="chatbot-panel__search-icon" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleSearch}
                    disabled={loading}
                    size="small"
                    className="chatbot-panel__search-btn"
                  >
                    <SearchIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            className="chatbot-panel__input"
          />
        </div>

        {/* Results area */}
        {loading && (
          <div className="chatbot-panel__loading">
            <CircularProgress size={22} />
            <Typography variant="body2">Searching calls...</Typography>
          </div>
        )}

        {!loading && hasSearched && (
          <div className="chatbot-panel__results">
            {/* Filter chips */}
            {filters.length > 0 && (
              <div className="chatbot-panel__filters">
                <Typography variant="caption" className="chatbot-panel__filters-label">
                  FILTER GRAPH TO
                </Typography>
                <div className="chatbot-panel__chips">
                  {filters.map((f, i) => (
                    <span key={i} className="chatbot-chip">
                      <span className="chatbot-chip__dot" data-type={f.type} />
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Matching calls count */}
            <Typography variant="caption" className="chatbot-panel__match-count">
              MATCHING CALLS : {totalMatches}
            </Typography>

            {/* Call cards */}
            <div className="chatbot-panel__cards">
              {matchedCalls.map((call, i) => (
                <div
                  key={call.identifier || i}
                  className="chatbot-call-card"
                  onClick={() => handleCardClick(call)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleCardClick(call)}
                >
                  <Typography variant="caption" className="chatbot-call-card__id">
                    {call.identifier}
                  </Typography>
                  <Typography variant="body2" className="chatbot-call-card__title">
                    {call.title}
                  </Typography>
                  <div className="chatbot-call-card__meta">
                    <span>&gt; {call.deadline}</span>
                    {call.budget_label && call.budget_label !== "Not available" && (
                      <span className="chatbot-call-card__budget">
                        {call.budget_label}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* AI answer */}
            {answer && (
              <div className="chatbot-panel__answer">
                <AutoAwesomeIcon className="chatbot-panel__answer-icon" />
                <div className="chatbot-panel__answer-text">
                  <MarkdownContent text={answer} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasSearched && (
          <div className="chatbot-panel__empty">
            <AutoAwesomeIcon className="chatbot-panel__empty-icon" />
            <Typography variant="body2">
              Ask in plain language to search Horizon Europe calls
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBot;
