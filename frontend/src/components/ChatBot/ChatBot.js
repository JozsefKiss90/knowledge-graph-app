// ChatBot.js  –  Redesigned AI search panel (centered modal)
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  IconButton,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
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

/* ── Filter-chip helpers (pure; module-level so they aren't effect deps) ──── */
const chipKey = (f) => `${f.type}::${f.label}`;

// Does a result card satisfy a given "FILTER RESULTS" chip?
function chipMatchesCall(chip, call) {
  if (chip.type === "programme") {
    // chip label is the call_title (or its call_identifier fallback)
    return (call.call_title || "") === chip.label || (call.cluster || "") === chip.label;
  }
  if (chip.type === "action_type") {
    return (call.action_type || "") === chip.label;
  }
  if (chip.type === "status") {
    const todayISO = new Date().toISOString().slice(0, 10);
    const isOpen = (call.deadline || "") >= todayISO;
    const label = chip.label.toLowerCase();
    if (label.startsWith("open")) return isOpen;
    if (label.startsWith("closed")) return !isOpen;
  }
  return true;
}

const ChatBot = ({
  onOpenDetail,
  onAssistantResults,
  onLocateCall,
  onClearAssistant,
  locateCall,
}) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [matchedCalls, setMatchedCalls] = useState([]);
  const [filters, setFilters] = useState([]);
  const [activeChips, setActiveChips] = useState(() => new Set()); // `${type}::${label}`
  const [totalMatches, setTotalMatches] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    const stored = JSON.parse(localStorage.getItem("bookmarkedCalls") || "[]");
    return new Set(stored.map((b) => b.id));
  });
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

  // ── "FILTER RESULTS" chips: filter the result set + graph highlight ───────
  // Apply active chips: chips of the same type are OR'd, different types AND'd.
  const displayedCalls = useMemo(() => {
    if (!activeChips.size) return matchedCalls;
    const active = filters.filter((f) => activeChips.has(chipKey(f)));
    if (!active.length) return matchedCalls;
    const byType = {};
    active.forEach((f) => {
      (byType[f.type] = byType[f.type] || []).push(f);
    });
    return matchedCalls.filter((call) =>
      Object.values(byType).every((group) => group.some((chip) => chipMatchesCall(chip, call)))
    );
  }, [matchedCalls, filters, activeChips]);

  // Keep the graph highlight in sync with whatever the chips currently show.
  useEffect(() => {
    if (!hasSearched) return;
    onAssistantResults?.(displayedCalls);
  }, [displayedCalls, hasSearched, onAssistantResults]);

  const toggleChip = (f) => {
    const key = chipKey(f);
    setActiveChips((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSearch = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setHasSearched(true);
    setAnswer("");
    setMatchedCalls([]);
    setFilters([]);
    setActiveChips(new Set()); // a new search clears any chip filters
    setTotalMatches(0);

    try {
      const res = await fetch(`${API_BASE}/chatbot/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = await res.json();
      const calls = data?.matched_calls ?? [];
      setAnswer(data?.answer ?? "");
      setMatchedCalls(calls);
      setFilters(data?.filters ?? []);
      setTotalMatches(data?.total_matches ?? 0);
      // The graph highlight is driven by `displayedCalls` via an effect, so it
      // stays in sync as chip filters are toggled.
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

  // A3: primary card action — drive the graph to the call (highlight + zoom).
  // Falls back to opening the detail panel when the call isn't in the loaded graph.
  const handleLocate = (call) => {
    const located = call?.identifier && onLocateCall ? onLocateCall(call.identifier) : false;
    if (located) {
      setOpen(false);
    } else {
      handleCardClick(call);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const toggleBookmark = (call, e) => {
    e.stopPropagation(); // don't trigger card click
    const stored = JSON.parse(localStorage.getItem("bookmarkedCalls") || "[]");
    const exists = stored.find((b) => b.id === call.identifier);
    let next;
    if (exists) {
      next = stored.filter((b) => b.id !== call.identifier);
    } else {
      next = [...stored, { id: call.identifier, name: call.title }];
    }
    localStorage.setItem("bookmarkedCalls", JSON.stringify(next));
    setBookmarkedIds(new Set(next.map((b) => b.id)));
    window.dispatchEvent(new Event("bookmarksChanged"));
  };

  const handleReset = () => {
    setInput("");
    setAnswer("");
    setMatchedCalls([]);
    setFilters([]);
    setActiveChips(new Set());
    setTotalMatches(0);
    setHasSearched(false);
    onClearAssistant?.();
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
            {/* Filter chips — click to narrow the results + graph highlight */}
            {filters.length > 0 && (
              <div className="chatbot-panel__filters">
                <Typography variant="caption" className="chatbot-panel__filters-label">
                  FILTER RESULTS
                </Typography>
                <div className="chatbot-panel__chips">
                  {filters.map((f, i) => {
                    const active = activeChips.has(chipKey(f));
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`chatbot-chip${active ? " chatbot-chip--active" : ""}`}
                        aria-pressed={active}
                        onClick={() => toggleChip(f)}
                      >
                        <span className="chatbot-chip__dot" data-type={f.type} />
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Matching calls count + clear-highlight */}
            <div className="chatbot-panel__match-row">
              <Typography variant="caption" className="chatbot-panel__match-count">
                MATCHING CALLS :{" "}
                {activeChips.size > 0 && displayedCalls.length !== totalMatches
                  ? `${displayedCalls.length} of ${totalMatches}`
                  : totalMatches}
              </Typography>
              {matchedCalls.length > 0 && (
                <button
                  type="button"
                  className="chatbot-panel__clear"
                  onClick={() => onClearAssistant?.()}
                >
                  Clear highlight
                </button>
              )}
            </div>

            {/* Call cards */}
            <div className="chatbot-panel__cards">
              {displayedCalls.map((call, i) => {
                const onGraph = !!(locateCall && call.identifier && locateCall(call.identifier));
                return (
                <div
                  key={call.identifier || i}
                  className="chatbot-call-card"
                  onClick={() => handleLocate(call)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleLocate(call)}
                >
                  <div className="chatbot-call-card__header">
                    <Typography variant="caption" className="chatbot-call-card__id">
                      {call.identifier}
                    </Typography>
                    <div className="chatbot-call-card__actions">
                      <Tooltip title="Open details" placement="top" arrow>
                        <IconButton
                          size="small"
                          className="chatbot-call-card__details"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(call);
                          }}
                        >
                          <ArticleOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={bookmarkedIds.has(call.identifier) ? "Remove bookmark" : "Bookmark call"}
                        placement="top"
                        arrow
                      >
                        <IconButton
                          size="small"
                          className="chatbot-call-card__bookmark"
                          onClick={(e) => toggleBookmark(call, e)}
                        >
                          {bookmarkedIds.has(call.identifier)
                            ? <BookmarkIcon fontSize="small" />
                            : <BookmarkBorderIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>
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
                    {onGraph ? (
                      <span className="chatbot-call-card__locate">
                        <CenterFocusStrongIcon fontSize="inherit" />
                        Show in graph
                      </span>
                    ) : (
                      <span className="chatbot-call-card__locate chatbot-call-card__locate--off">
                        not on graph
                      </span>
                    )}
                  </div>
                </div>
                );
              })}
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
