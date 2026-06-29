// src/components/GraphPage/CommandPalette/CommandPalette.jsx
//
// Tier 3.2 — Ctrl/Cmd-K command palette.
//
// A single searchable launcher for every action scattered across the sidebar,
// top bar, layout drawer and breadcrumb. Commands are supplied by buildCommands();
// this component owns only the search/keyboard UI.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Box } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

function matchCommands(commands, query) {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  const tokens = q.split(/\s+/);
  return commands.filter((c) => {
    const hay = `${c.label} ${c.group} ${c.keywords || ""}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}

export default function CommandPalette({ open, onClose, commands }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const activeItemRef = useRef(null);

  const filtered = useMemo(() => matchCommands(commands, query), [commands, query]);

  // Reset query + focus the input each time the palette opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      // focus after the modal mounts
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Keep the active row valid (and on a selectable command) as results change.
  useEffect(() => {
    const first = filtered.findIndex((c) => !c.disabled);
    setActiveIndex(first === -1 ? 0 : first);
  }, [filtered, open]);

  // Scroll the active row into view.
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const moveActive = (dir) => {
    if (!filtered.length) return;
    let i = activeIndex;
    for (let step = 0; step < filtered.length; step++) {
      i = (i + dir + filtered.length) % filtered.length;
      if (!filtered[i]?.disabled) break;
    }
    setActiveIndex(i);
  };

  const runCommand = (cmd) => {
    if (!cmd || cmd.disabled) return;
    onClose?.();
    // Defer so the modal teardown doesn't race state updates the command triggers.
    setTimeout(() => {
      try {
        cmd.perform?.();
      } catch {
        /* no-op */
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      runCommand(filtered[activeIndex]);
    }
    // Escape is handled by the Modal's onClose.
  };

  // Group results in their declared order while tracking each item's flat index.
  const groups = useMemo(() => {
    const order = [];
    const map = new Map();
    filtered.forEach((c, idx) => {
      if (!map.has(c.group)) {
        map.set(c.group, []);
        order.push(c.group);
      }
      map.get(c.group).push({ cmd: c, idx });
    });
    return order.map((g) => ({ group: g, items: map.get(g) }));
  }, [filtered]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-label="Command palette"
      className="command-palette-modal"
    >
      <Box className="command-palette" onKeyDown={handleKeyDown}>
        <div className="command-palette__search">
          <SearchIcon className="command-palette__search-icon" fontSize="small" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette__input"
            placeholder="Search actions, programmes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            aria-label="Search commands"
          />
        </div>

        <div className="command-palette__list" role="listbox">
          {filtered.length === 0 ? (
            <div className="command-palette__empty">No matching actions.</div>
          ) : (
            groups.map(({ group, items }) => (
              <div key={group} className="command-palette__group">
                <div className="command-palette__group-label">{group}</div>
                {items.map(({ cmd, idx }) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      ref={isActive ? activeItemRef : null}
                      role="option"
                      aria-selected={isActive}
                      className={`command-palette__item${isActive ? " is-active" : ""}${
                        cmd.disabled ? " is-disabled" : ""
                      }`}
                      disabled={cmd.disabled}
                      onMouseEnter={() => !cmd.disabled && setActiveIndex(idx)}
                      onClick={() => runCommand(cmd)}
                    >
                      <span className="command-palette__item-label">{cmd.label}</span>
                      {cmd.disabled && cmd.disabledReason && (
                        <span className="command-palette__item-reason">{cmd.disabledReason}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="command-palette__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </Box>
    </Modal>
  );
}
