// src/components/GraphPage/FindCalls/FindCallsPanel.jsx
//
// Tier 3.3 — the unified "Find calls" workspace.
//
// A graph-mode docked panel that filters every preloaded call by structured
// facets (status / programme / action type / deadline year / budget) plus an
// honestly coverage-gated CORDIS research-field facet and free text, then drives
// the EXISTING assistant graph-highlight pipeline (onAssistantResults) so matches
// glow on the graph behind it. Rows locate on the graph (onLocateCall) or open
// detail. One highlight channel shared with the AI chat (last writer wins).

import React, { useEffect, useMemo, useRef, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MyLocationIcon from "@mui/icons-material/MyLocation";

import { useAllCalls } from "./useAllCalls";
import {
  FACET_GROUPS,
  STATUS_LABELS,
  BUDGET_BUCKET_LABELS,
  facetCounts,
  orderFacetValues,
  filterCalls,
  anyFacetActive,
  facetSummary,
} from "./callFacets";

const RESULT_CAP = 250;
const TAG_CAP = 40;
const DEFAULT_EXPANDED = { status: true, programmeKey: true };

function formatDeadline(date) {
  if (!date) return "—";
  try {
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatBudget(n) {
  if (!n || n <= 0) return "—";
  if (n >= 1e9) return `€${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `€${Math.round(n / 1e6)}M`;
  if (n >= 1e3) return `€${Math.round(n / 1e3)}k`;
  return `€${n}`;
}

export default function FindCallsPanel({
  open,
  onClose,
  loadFromStore,
  onAssistantResults,
  onLocateCall,
  onClearAssistant,
  locateCall,
  onOpenDetail,
}) {
  const allCalls = useAllCalls(loadFromStore);

  const [selected, setSelected] = useState({});
  const [text, setText] = useState("");
  const [sortBy, setSortBy] = useState("deadline"); // "deadline" | "budget"
  const [expanded, setExpanded] = useState(DEFAULT_EXPANDED);
  const weHighlightedRef = useRef(false);

  const counts = useMemo(
    () => Object.fromEntries(FACET_GROUPS.map((g) => [g.key, facetCounts(allCalls, g.key)])),
    [allCalls]
  );

  const programmeLabelByKey = useMemo(() => {
    const m = {};
    for (const c of allCalls) m[c.programmeKey] = c.programmeLabel;
    return m;
  }, [allCalls]);

  const filtered = useMemo(() => filterCalls(allCalls, selected, text), [allCalls, selected, text]);

  const results = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === "budget") {
      arr.sort((a, b) => (b.budget || 0) - (a.budget || 0));
    } else {
      arr.sort((a, b) => {
        const at = a.closeDate ? a.closeDate.getTime() : Infinity;
        const bt = b.closeDate ? b.closeDate.getTime() : Infinity;
        return at - bt;
      });
    }
    return arr;
  }, [filtered, sortBy]);

  const active = anyFacetActive(selected, text);

  // Drive the shared graph-highlight pipeline while the panel is open. Debounced
  // so typing/chip toggles don't thrash the Cytoscape paint. We only clear the
  // highlight if WE set it (so opening an empty panel never wipes a chat highlight).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (active) {
        onAssistantResults?.(
          results.map((c) => ({ identifier: c.id })),
          facetSummary(selected, text),
          "find"
        );
        weHighlightedRef.current = true;
      } else if (weHighlightedRef.current) {
        onClearAssistant?.("find");
        weHighlightedRef.current = false;
      }
    }, 200);
    return () => clearTimeout(t);
  }, [open, results, active, selected, text, onAssistantResults, onClearAssistant]);

  // Surrender OUR highlight when the panel closes or unmounts (dashboard / node
  // detail switch), so a hidden/absent panel never leaves an orphaned highlight +
  // constraint pill. The sourced clear is a no-op if the chat now owns the channel.
  const clearRef = useRef(onClearAssistant);
  clearRef.current = onClearAssistant;
  useEffect(() => {
    if (!open && weHighlightedRef.current) {
      onClearAssistant?.("find");
      weHighlightedRef.current = false;
    }
  }, [open, onClearAssistant]);
  useEffect(
    () => () => {
      if (weHighlightedRef.current) {
        clearRef.current?.("find");
        weHighlightedRef.current = false;
      }
    },
    []
  );

  const toggleValue = (groupKey, value) => {
    setSelected((prev) => {
      const next = { ...prev };
      const set = new Set(next[groupKey] || []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      if (set.size === 0) delete next[groupKey];
      else next[groupKey] = set;
      return next;
    });
  };

  const clearAll = () => {
    setSelected({});
    setText("");
  };

  const toggleExpanded = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const labelFor = (groupKey, value) => {
    if (groupKey === "status") return STATUS_LABELS[value] || value;
    if (groupKey === "programmeKey") return programmeLabelByKey[value] || value;
    if (groupKey === "budgetBucket") return BUDGET_BUCKET_LABELS[value] || value;
    if (groupKey === "typeOfAction") return value === "Unknown" ? "Unspecified" : value;
    return value;
  };

  const handleRowClick = (call) => {
    const located = onLocateCall?.(call.id);
    if (!located) onOpenDetail?.({ id: call.id });
  };

  const activeCount = (groupKey) => selected[groupKey]?.size || 0;
  const shown = results.slice(0, RESULT_CAP);

  return (
    <div className={`find-calls${open ? " is-open" : ""}`} aria-hidden={!open}>
      <div className="find-calls__header">
        <div className="find-calls__title-row">
          <h3 className="find-calls__title">Find calls</h3>
          <Tooltip title="Close">
            <IconButton size="small" onClick={onClose} aria-label="Close find calls" className="find-calls__close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
        <div className="find-calls__search">
          <SearchIcon fontSize="small" className="find-calls__search-icon" />
          <input
            type="text"
            className="find-calls__search-input"
            placeholder="Search calls by title, id or field…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                if (text) setText("");
                else onClose?.();
              }
            }}
            spellCheck={false}
            autoComplete="off"
          />
          {text && (
            <button type="button" className="find-calls__search-clear" onClick={() => setText("")} aria-label="Clear search">
              <CloseIcon fontSize="inherit" />
            </button>
          )}
        </div>
        <div className="find-calls__summary">
          <span className="find-calls__count">
            <strong>{results.length.toLocaleString()}</strong> of {allCalls.length.toLocaleString()} calls
          </span>
          {active && (
            <button type="button" className="find-calls__clear-all" onClick={clearAll}>
              Clear filters
            </button>
          )}
        </div>
        {active && (
          <p className="find-calls__hint">Matching calls are highlighted on the graph.</p>
        )}
      </div>

      <div className="find-calls__facets">
        {FACET_GROUPS.map((g) => {
          const ordered = orderFacetValues(g.key, counts[g.key]).slice(
            0,
            g.key === "tags" ? TAG_CAP : 200
          );
          const isOpen = !!expanded[g.key];
          const n = activeCount(g.key);
          return (
            <div key={g.key} className={`find-calls__group${isOpen ? " is-expanded" : ""}`}>
              <button
                type="button"
                className="find-calls__group-header"
                onClick={() => toggleExpanded(g.key)}
                aria-expanded={isOpen}
              >
                <ExpandMoreIcon fontSize="small" className="find-calls__group-caret" />
                <span className="find-calls__group-label">{g.label}</span>
                {n > 0 && <span className="find-calls__group-badge">{n}</span>}
              </button>
              {isOpen && (
                <div className="find-calls__group-body">
                  {g.gated && (
                    <p className="find-calls__gated-note">
                      Only calls with CORDIS funded-project evidence carry research fields. Untagged
                      calls won't match a field filter.
                    </p>
                  )}
                  {ordered.length === 0 ? (
                    <p className="find-calls__empty-facet">No values.</p>
                  ) : (
                    <div className="find-calls__chips">
                      {ordered.map(([value, count]) => {
                        const on = selected[g.key]?.has(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            className={`find-calls__chip${on ? " is-on" : ""}`}
                            aria-pressed={!!on}
                            onClick={() => toggleValue(g.key, value)}
                          >
                            <span className="find-calls__chip-label">{labelFor(g.key, value)}</span>
                            <span className="find-calls__chip-count">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="find-calls__results">
        <div className="find-calls__results-head">
          <span className="find-calls__results-label">Results</span>
          <div className="find-calls__sort">
            <button
              type="button"
              className={`find-calls__sort-btn${sortBy === "deadline" ? " is-on" : ""}`}
              onClick={() => setSortBy("deadline")}
            >
              Deadline
            </button>
            <button
              type="button"
              className={`find-calls__sort-btn${sortBy === "budget" ? " is-on" : ""}`}
              onClick={() => setSortBy("budget")}
            >
              Budget
            </button>
          </div>
        </div>

        <ul className="find-calls__list">
          {shown.map((c) => {
            const onGraph = typeof locateCall === "function" ? !!locateCall(c.id) : true;
            return (
              <li key={c.id} className="find-calls__row">
                <button type="button" className="find-calls__row-btn" onClick={() => handleRowClick(c)} title={c.label}>
                  <span className="find-calls__row-top">
                    <span
                      className="find-calls__prog-dot"
                      style={{ background: c.programmeColor }}
                      title={c.programmeLabel}
                    />
                    <span className="find-calls__row-label">{c.label}</span>
                    {onGraph && <MyLocationIcon fontSize="inherit" className="find-calls__row-locate" />}
                  </span>
                  <span className="find-calls__row-meta">
                    <span className={`find-calls__badge find-calls__badge--${c.status}`}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                    <span className="find-calls__meta-item">{c.programmeLabel}</span>
                    {c.typeOfAction && <span className="find-calls__meta-item">{c.typeOfAction}</span>}
                    <span className="find-calls__meta-item">{formatDeadline(c.closeDate)}</span>
                    {c.budget > 0 && <span className="find-calls__meta-item">{formatBudget(c.budget)}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {results.length > RESULT_CAP && (
          <p className="find-calls__more">
            Showing first {RESULT_CAP} of {results.length.toLocaleString()} — narrow the filters to see the rest
            (all {results.length.toLocaleString()} are highlighted on the graph).
          </p>
        )}
        {results.length === 0 && (
          <p className="find-calls__no-results">No calls match these filters.</p>
        )}
      </div>
    </div>
  );
}
