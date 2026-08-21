// src/components/GraphPage/CommandPalette/buildCommands.js
//
// Tier 3.2 — the command palette's action inventory.
//
// Pure builder: given the GraphPage-level handlers + current view flags, returns a
// flat, grouped list of commands. Every command maps to a handler that already
// exists in GraphPage (the same ones the sidebar / top bar dispatch), so the
// palette is a second front-end to the existing actions, not a re-implementation.

import { GRAPH_ENDPOINTS } from "../useGraphData";
import { PROGRAMME_DISPLAY } from "../TimelineScrubber/utils";

const HE_WIKI_REASON = "Not available for the Horizon Europe Wiki dataset";

/** Friendly label for a navigable graph key. */
function programmeLabel(key) {
  if (key === "ROOT") return "Home — all programmes";
  if (key === "HE_2025") return "Horizon Europe Wiki";
  return PROGRAMME_DISPLAY[key]?.label || key.replace(/_/g, " ");
}

/** Ordered list of navigable programmes for the palette. */
export const PROGRAMME_KEYS = ["ROOT", ...Object.keys(GRAPH_ENDPOINTS)];

export function buildCommands(ctx) {
  const {
    viewMode,
    isHEWiki,
    assistantActive,
    countryActive,
    timelineActive,
    timelineOpen,
    compareOpen,
    findOpen,
    darkMode,
    // handlers
    setViewMode,
    onGoToProgramme,
    onToggleFind,
    updateOption,
    onResetView,
    onFitView,
    setCompareOpen,
    setTimelineOpen,
    onSelectDashboardPanel,
    onResetFilters,
    onClearAssistant,
    setCountryOverlayCode,
    setTimelineSelection,
    setDarkMode,
    setDrawerOpen,
    setIsMessageDrawerOpen,
    onCopyLink,
    onSaveView,
    navigate,
  } = ctx;

  const cmds = [];
  const add = (c) => cmds.push(c);

  // ── View ──────────────────────────────────────────────────────────────────
  add({
    id: "view-toggle-dashboard",
    group: "View",
    label: viewMode === "dashboard" ? "Back to funding map" : "Open portfolio dashboard",
    keywords: "dashboard graph map portfolio overview kpi",
    perform: () => setViewMode(viewMode === "dashboard" ? "graph" : "dashboard"),
  });
  add({
    id: "view-reset-camera",
    group: "View",
    label: "Reset camera",
    keywords: "reset camera recenter zoom view",
    disabled: viewMode !== "graph",
    disabledReason: "Switch to the graph first",
    perform: () => onResetView?.(),
  });
  add({
    id: "view-fit-screen",
    group: "View",
    label: "Fit graph to screen",
    keywords: "fit screen zoom to fit",
    disabled: viewMode !== "graph",
    disabledReason: "Switch to the graph first",
    perform: () => onFitView?.(),
  });

  // ── Share ─────────────────────────────────────────────────────────────────
  add({
    id: "share-copy-link",
    group: "Share",
    label: "Copy link to this view",
    keywords: "copy link share url deep link bookmark",
    perform: () => onCopyLink?.(),
  });
  add({
    id: "share-save-view",
    group: "Share",
    label: "Save current view…",
    keywords: "save view bookmark named saved searches",
    perform: () => onSaveView?.(),
  });

  // ── Tools ─────────────────────────────────────────────────────────────────
  add({
    id: "tool-find",
    group: "Tools",
    label: findOpen ? "Close Find calls" : "Find calls",
    keywords: "find calls search filter facets workspace status programme action budget",
    disabled: isHEWiki || viewMode !== "graph",
    disabledReason: isHEWiki ? HE_WIKI_REASON : "Switch to the graph first",
    perform: () => onToggleFind?.(),
  });
  add({
    id: "tool-compare",
    group: "Tools",
    label: compareOpen ? "Close compare drawer" : "Compare programmes",
    keywords: "compare versus diff programmes side by side",
    disabled: isHEWiki || viewMode !== "graph",
    disabledReason: isHEWiki ? HE_WIKI_REASON : "Switch to the graph first",
    perform: () => setCompareOpen((p) => !p),
  });
  add({
    id: "tool-timeline",
    group: "Tools",
    label: timelineOpen ? "Hide timeline scrubber" : "Show timeline scrubber",
    keywords: "timeline scrubber dates deadlines calendar",
    disabled: isHEWiki || viewMode !== "graph",
    disabledReason: isHEWiki ? HE_WIKI_REASON : "Switch to the graph first",
    perform: () => setTimelineOpen((p) => !p),
  });
  add({
    id: "tool-fields",
    group: "Tools",
    label: "Research fields (CORDIS)",
    keywords: "research fields euroscivoc topics cordis explorer",
    disabled: isHEWiki,
    disabledReason: HE_WIKI_REASON,
    perform: () => onSelectDashboardPanel?.("fields"),
  });
  add({
    id: "tool-country",
    group: "Tools",
    label: "Country activity overlay",
    keywords: "country activity overlay map cordis funded",
    disabled: isHEWiki,
    disabledReason: HE_WIKI_REASON,
    perform: () => onSelectDashboardPanel?.("country"),
  });
  add({
    id: "tool-hopon",
    group: "Tools",
    label: "Hop-on opportunities",
    keywords: "hop on hosts widening cordis partners",
    disabled: isHEWiki,
    disabledReason: HE_WIKI_REASON,
    perform: () => onSelectDashboardPanel?.("hopOn"),
  });

  // ── Layout ────────────────────────────────────────────────────────────────
  add({
    id: "layout-force",
    group: "Layout",
    label: "Force-directed layout",
    keywords: "layout force directed cose bilkent physics",
    disabled: isHEWiki,
    disabledReason: HE_WIKI_REASON,
    perform: () => updateOption?.("name", "cose-bilkent"),
  });
  add({
    id: "layout-tree",
    group: "Layout",
    label: "Hierarchical (tree) layout",
    keywords: "layout hierarchical tree breadthfirst",
    disabled: isHEWiki,
    disabledReason: HE_WIKI_REASON,
    perform: () => updateOption?.("name", "breadthfirst"),
  });

  // ── Filters ─────────────────────────────────────────────────────────────────
  add({
    id: "filter-clear-all",
    group: "Filters",
    label: "Clear all filters",
    keywords: "clear reset all filters timeline country assistant compare",
    perform: () => onResetFilters?.(),
  });
  if (assistantActive) {
    add({
      id: "filter-clear-assistant",
      group: "Filters",
      label: "Clear AI search highlight",
      keywords: "clear assistant ai highlight search",
      perform: () => onClearAssistant?.(),
    });
  }
  if (countryActive) {
    add({
      id: "filter-clear-country",
      group: "Filters",
      label: "Clear country overlay",
      keywords: "clear country overlay paint",
      perform: () => setCountryOverlayCode?.(""),
    });
  }
  if (timelineActive) {
    add({
      id: "filter-clear-timeline",
      group: "Filters",
      label: "Clear timeline window",
      keywords: "clear timeline window dates",
      perform: () => setTimelineSelection?.(null),
    });
  }

  // ── Settings ────────────────────────────────────────────────────────────────
  add({
    id: "settings-theme",
    group: "Settings",
    label: darkMode ? "Switch to light mode" : "Switch to dark mode",
    keywords: "theme dark light mode appearance",
    perform: () => setDarkMode?.((p) => !p),
  });
  add({
    id: "settings-layout-drawer",
    group: "Settings",
    label: "Open layout & settings",
    keywords: "settings layout drawer options sliders",
    perform: () => setDrawerOpen?.(true),
  });
  add({
    id: "settings-contact",
    group: "Settings",
    label: "Send a message",
    keywords: "contact message feedback email",
    perform: () => setIsMessageDrawerOpen?.(true),
  });

  // ── Navigate ──────────────────────────────────────────────────────────────
  add({
    id: "nav-bookmarks",
    group: "Navigate",
    label: "View bookmarks",
    keywords: "bookmarks saved calls",
    perform: () => navigate?.("/bookmarks"),
  });
  add({
    id: "nav-tour",
    group: "Navigate",
    label: "Restart guided tour",
    keywords: "tour guide help onboarding restart walkthrough",
    perform: () => navigate?.("/?tour=1"),
  });
  add({
    id: "nav-about",
    group: "Navigate",
    label: "Help & docs",
    keywords: "help docs about documentation guide",
    perform: () => navigate?.("/about"),
  });

  // ── Go to programme ─────────────────────────────────────────────────────────
  for (const key of PROGRAMME_KEYS) {
    add({
      id: `goto-${key}`,
      group: "Go to programme",
      label: `Go to ${programmeLabel(key)}`,
      keywords: `go to open programme ${key} ${programmeLabel(key)}`,
      // Routes through applyView (in GraphPage) so it forces navigation even when
      // the graph is already in that programme but drilled into a destination.
      perform: () => onGoToProgramme?.(key),
    });
  }

  return cmds;
}
