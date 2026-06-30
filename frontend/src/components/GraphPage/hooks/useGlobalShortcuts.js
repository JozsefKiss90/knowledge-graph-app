// src/components/GraphPage/hooks/useGlobalShortcuts.js
//
// Tier 3.2 — global keyboard shortcuts.
//
//   Ctrl/Cmd+K   toggle the command palette (works even while typing)
//   /            open the command palette
//   Esc          close the palette, else clear the AI highlight + close drawers
//   Backspace/←  drill out one graph layer
//   D            toggle the dashboard
//   C            toggle compare      (graph datasets only)
//   T            toggle the timeline (graph datasets only)
//
// All single-letter / navigation shortcuts are ignored while a text field is
// focused, so they never fight typing in the search box or chat.

import { useEffect } from "react";

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable === true
  );
}

/**
 * @param {object} cfg
 * @param {boolean} cfg.paletteOpen
 * @param {() => void} cfg.openPalette
 * @param {() => void} cfg.closePalette
 * @param {() => void} cfg.onEscape           dismiss action when palette is closed
 * @param {React.MutableRefObject<{canGoBack:boolean,onBack:Function}>} cfg.levelNavRef
 * @param {() => void} cfg.onToggleDashboard
 * @param {() => void} cfg.onToggleCompare
 * @param {() => void} cfg.onToggleTimeline
 * @param {boolean} cfg.toolsEnabled          false for the HE Wiki dataset
 * @param {boolean} cfg.inGraphMode           graph view (not dashboard / detail)
 */
export function useGlobalShortcuts({
  paletteOpen,
  openPalette,
  closePalette,
  onEscape,
  levelNavRef,
  onToggleDashboard,
  onToggleCompare,
  onToggleTimeline,
  onToggleFind,
  toolsEnabled,
  inGraphMode,
}) {
  useEffect(() => {
    // A modal-like overlay (the chat panel) is mounted only while open and traps no
    // focus, so it must own all non-palette keys while up.
    const overlayOpen = () => !!document.querySelector(".chatbot-overlay");

    const handler = (e) => {
      const k = e.key;
      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+K — palette toggle, allowed even while typing.
      if (mod && (k === "k" || k === "K")) {
        e.preventDefault();
        paletteOpen ? closePalette() : openPalette();
        return;
      }

      if (k === "Escape") {
        if (paletteOpen) {
          closePalette();
        } else if (!isTypingTarget(e.target) && !overlayOpen()) {
          // A focused input / the open chat panel owns its own Escape; only the
          // bare graph should treat Escape as "dismiss highlight + drawers".
          onEscape?.();
        }
        return;
      }

      // The palette / chat overlay own all other keys while open.
      if (paletteOpen) return;
      if (isTypingTarget(e.target)) return;
      if (overlayOpen()) return;
      // Don't hijack browser/OS chords (Cmd+L, Alt+←, …).
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (k === "/") {
        e.preventDefault();
        openPalette();
        return;
      }

      if (k === "Backspace" || k === "ArrowLeft") {
        if (inGraphMode && levelNavRef?.current?.canGoBack) {
          e.preventDefault();
          levelNavRef.current.onBack?.();
        }
        return;
      }

      if (k === "d" || k === "D") {
        e.preventDefault();
        onToggleDashboard?.();
        return;
      }
      if (k === "c" || k === "C") {
        if (toolsEnabled && inGraphMode) {
          e.preventDefault();
          onToggleCompare?.();
        }
        return;
      }
      if (k === "t" || k === "T") {
        if (toolsEnabled && inGraphMode) {
          e.preventDefault();
          onToggleTimeline?.();
        }
        return;
      }
      if (k === "f" || k === "F") {
        if (toolsEnabled && inGraphMode) {
          e.preventDefault();
          onToggleFind?.();
        }
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    paletteOpen,
    openPalette,
    closePalette,
    onEscape,
    levelNavRef,
    onToggleDashboard,
    onToggleCompare,
    onToggleTimeline,
    onToggleFind,
    toolsEnabled,
    inGraphMode,
  ]);
}
