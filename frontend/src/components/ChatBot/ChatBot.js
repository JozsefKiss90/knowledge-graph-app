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
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useDarkMode } from "../context/DarkModeContext";
import OrgLink from "../GraphPage/CordisEvidence/OrgLink";

/* Compact euro label for the funded-evidence block (mirrors OrgDossier.fmtEuro). */
function fmtEuro(n) {
  const v = Number(n) || 0;
  if (v <= 0) return "—";
  if (v >= 1e9) return `€${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `€${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `€${Math.round(v / 1e3)}k`;
  return `€${Math.round(v)}`;
}

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

// The "active result" turn that owns the cards / CORDIS block / graph highlight: the
// newest assistant turn that actually produced calls and did NOT error. A failed or
// purely-conversational follow-up therefore never collapses or wipes the prior view.
function pickResultTurn(messages) {
  for (let k = messages.length - 1; k >= 0; k--) {
    const m = messages[k];
    if (m.role === "assistant" && !m.error && (m.matchedCalls || []).length > 0) return m;
  }
  return null;
}

const ChatBot = ({
  onOpenDetail,
  onAssistantResults,
  onLocateCall,
  onClearAssistant,
  locateCall,
  openSignal,
}) => {
  const [open, setOpen] = useState(false);

  // The left rail's sparkle button pops the assistant open by bumping this
  // token; the panel otherwise keeps owning its open/close state.
  useEffect(() => {
    if (openSignal) setOpen(true);
  }, [openSignal]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Multi-turn (Tier 3.5): the whole conversation is held client-side. Each entry is
  // either { role:'user', content } or { role:'assistant', answer, matchedCalls,
  // filters, totalMatches, cordis, query, error? }. The backend stays stateless — we
  // send the prior turns as `history` on every request.
  const [messages, setMessages] = useState([]);
  const [activeChips, setActiveChips] = useState(() => new Set()); // `${type}::${label}` — narrows the LATEST turn
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    const stored = JSON.parse(localStorage.getItem("bookmarkedCalls") || "[]");
    return new Set(stored.map((b) => b.id));
  });
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

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

  // The active-result turn owns the cards / CORDIS block / graph highlight.
  const resultTurn = useMemo(() => pickResultTurn(messages), [messages]);

  // ── "FILTER RESULTS" chips: narrow the active turn's calls + graph highlight ──
  // Same-type chips are OR'd, different types AND'd. Chips apply to the active turn.
  const displayedCalls = useMemo(() => {
    const mc = resultTurn?.matchedCalls || [];
    if (!activeChips.size) return mc;
    const active = (resultTurn?.filters || []).filter((f) => activeChips.has(chipKey(f)));
    if (!active.length) return mc;
    const byType = {};
    active.forEach((f) => {
      (byType[f.type] = byType[f.type] || []).push(f);
    });
    return mc.filter((call) =>
      Object.values(byType).every((group) => group.some((chip) => chipMatchesCall(chip, call)))
    );
  }, [resultTurn, activeChips]);

  // Keep the graph highlight in sync with the active turn (source "ai"), refining as
  // chips toggle. A new answer with matches REPLACES the prior highlight; an empty/
  // errored/conversational turn leaves the prior highlight intact (never wiped to []).
  useEffect(() => {
    if (!resultTurn || !displayedCalls.length) return;
    onAssistantResults?.(displayedCalls, resultTurn.query, "ai");
  }, [displayedCalls, resultTurn, onAssistantResults]);

  // Auto-scroll the transcript to the newest message / the loading row. `open` is a
  // dep so reopening a tall conversation lands on the latest answer, not the top.
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

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

    // Build history from COMPLETE user→assistant pairs (before appending this
    // question), so a turn whose answer errored is dropped WITH its user turn — this
    // keeps strict role alternation (some providers reject consecutive user turns).
    const history = [];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.role !== "user") continue;
      const next = messages[i + 1];
      if (next && next.role === "assistant" && !next.error && (next.answer || "").trim()) {
        if (m.content && m.content.trim()) {
          history.push({ role: "user", content: m.content });
          history.push({ role: "assistant", content: next.answer });
        }
        i++; // consume the paired assistant turn
      }
    }

    // Anchor a contextual follow-up to the calls currently in context, so the
    // structured side (cards / highlight / CORDIS) stays on the right calls.
    const contextCallIds = (pickResultTurn(messages)?.matchedCalls || [])
      .map((c) => c.identifier)
      .filter(Boolean);

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    const pushAssistant = (turn) =>
      setMessages((prev) => [...prev, { role: "assistant", query: trimmed, ...turn }]);

    try {
      const res = await fetch(`${API_BASE}/chatbot/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history, context_call_ids: contextCallIds }),
      });

      if (!res.ok) {
        let detail = "";
        try {
          const j = await res.json();
          detail = j?.detail || "";
        } catch {}
        pushAssistant({
          answer: `Sorry — the assistant couldn't answer (${detail || res.status}). The model may be slow right now; try again or simplify your question.`,
          matchedCalls: [],
          filters: [],
          totalMatches: 0,
          cordis: [],
          error: true,
        });
        return;
      }

      const data = await res.json();
      // A successful new turn supersedes the prior turn's chip narrowing. (Done here,
      // not at submit, so a failed follow-up leaves the prior turn's chips/highlight intact.)
      setActiveChips(new Set());
      pushAssistant({
        answer: data?.answer ?? "",
        matchedCalls: data?.matched_calls ?? [],
        filters: data?.filters ?? [],
        totalMatches: data?.total_matches ?? 0,
        cordis: data?.cordis ?? [],
      });
    } catch {
      pushAssistant({
        answer: "Error contacting the AI search service.",
        matchedCalls: [],
        filters: [],
        totalMatches: 0,
        cordis: [],
        error: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset the whole conversation and drop the graph highlight. Sourced "ai" so it only
  // clears a highlight the chat owns — a live Find-panel highlight is left untouched.
  const handleNewConversation = () => {
    setMessages([]);
    setInput("");
    setActiveChips(new Set());
    onClearAssistant?.("ai");
    setTimeout(() => inputRef.current?.focus(), 50);
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

  const themeClass = darkMode ? "chatbot--dark" : "chatbot--light";
  const hasConversation = messages.length > 0;
  const placeholder = hasConversation
    ? "Ask a follow-up — refine, or ask who's been funded"
    : "Ask about Horizon Europe calls — e.g. climate calls in cluster 5";

  // The chips / match-row / call cards / CORDIS evidence for the active result turn
  // (the set that drives the highlight). Other turns keep just their answer text.
  const renderLatestInteractive = () => {
    if (!resultTurn) return null;
    const turnFilters = resultTurn.filters || [];
    const totalMatches = resultTurn.totalMatches || 0;
    const cordis = resultTurn.cordis || [];
    const hasCalls = (resultTurn.matchedCalls || []).length > 0;

    return (
      <>
        {turnFilters.length > 0 && (
          <div className="chatbot-panel__filters">
            <Typography variant="caption" className="chatbot-panel__filters-label">
              FILTER RESULTS
            </Typography>
            <div className="chatbot-panel__chips">
              {turnFilters.map((f, i) => {
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

        {hasCalls && (
          <>
            <div className="chatbot-panel__match-row">
              <Typography variant="caption" className="chatbot-panel__match-count">
                MATCHING CALLS :{" "}
                {activeChips.size > 0 && displayedCalls.length !== totalMatches
                  ? `${displayedCalls.length} of ${totalMatches}`
                  : totalMatches}
              </Typography>
              <button
                type="button"
                className="chatbot-panel__clear"
                onClick={() => onClearAssistant?.("ai")}
              >
                Clear highlight
              </button>
            </div>

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
                        <span className="chatbot-call-card__budget">{call.budget_label}</span>
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
          </>
        )}

        {cordis.length > 0 && (
          <div className="chatbot-cordis">
            <div className="chatbot-cordis__head">
              <BusinessOutlinedIcon fontSize="inherit" /> Funded evidence (CORDIS)
            </div>
            <div className="chatbot-cordis__note">
              Past EU-funded projects matching these calls' subjects — not 2026–27 awards.
              Click an organisation to open its dossier in a new tab.
            </div>
            {cordis.map((ev) => (
              <div key={ev.call_id} className="chatbot-cordis__item">
                <div className="chatbot-cordis__subj">
                  <span className="chatbot-cordis__subj-text">
                    {ev.subject || ev.call_title || ev.call_id}
                  </span>
                  <span className="chatbot-cordis__nums">
                    {ev.projectCount} funded {ev.projectCount === 1 ? "project" : "projects"} ·{" "}
                    {fmtEuro(ev.totalEcContribution)}
                  </span>
                </div>
                {ev.topOrganisations?.length > 0 && (
                  <div className="chatbot-cordis__orgs">
                    {ev.topOrganisations.map((o, oi) => (
                      <OrgLink
                        key={o.id || o.name || oi}
                        id={o.id}
                        name={o.name}
                        className="chatbot-cordis__org"
                        newTab
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

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
        {/* Top actions: New chat (when a conversation exists) + Close */}
        {hasConversation && (
          <button
            type="button"
            className="chatbot-panel__newchat"
            onClick={handleNewConversation}
          >
            <RestartAltIcon fontSize="inherit" />
            New chat
          </button>
        )}
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
            placeholder={placeholder}
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

        {/* Empty state */}
        {!hasConversation && !loading && (
          <div className="chatbot-panel__empty">
            <AutoAwesomeIcon className="chatbot-panel__empty-icon" />
            <Typography variant="body2">
              Ask in plain language — search Horizon Europe calls, refine across turns,
              and see who's been funded in related areas.
            </Typography>
          </div>
        )}

        {/* Conversation transcript */}
        {(hasConversation || loading) && (
          <div className="chatbot-panel__results chatbot-panel__transcript" ref={scrollRef}>
            {messages.map((msg, idx) => {
              if (msg.role === "user") {
                return (
                  <div key={idx} className="chatbot-msg chatbot-msg--user">
                    <div className="chatbot-msg__bubble">{msg.content}</div>
                  </div>
                );
              }
              const isResultTurn = msg === resultTurn;
              return (
                <div
                  key={idx}
                  className={`chatbot-msg chatbot-msg--assistant${msg.error ? " chatbot-msg--error" : ""}`}
                >
                  {msg.answer && (
                    <div className="chatbot-panel__answer">
                      <AutoAwesomeIcon className="chatbot-panel__answer-icon" />
                      <div className="chatbot-panel__answer-text">
                        <MarkdownContent text={msg.answer} />
                      </div>
                    </div>
                  )}
                  {isResultTurn && renderLatestInteractive()}
                </div>
              );
            })}

            {loading && (
              <div className="chatbot-panel__loading">
                <CircularProgress size={20} />
                <Typography variant="body2">Thinking…</Typography>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBot;
