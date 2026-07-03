// src/components/GraphPage/GraphPage.js
import { useRef, useState, useEffect, useMemo, useCallback  } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Container, Row } from "react-bootstrap";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

import { CyContext } from "../context/CyContext";
import { useDarkMode } from "../context/DarkModeContext";

import { useLayoutOptions } from "./useLayoutOptions";
import { useGraphData } from "./useGraphData";

import { layoutConfig } from "../utils/layoutConfig";

import { useBookmarksCount } from "./hooks/useBookmarksCount";
import { usePendingNav } from "./hooks/usePendingNav";
import { useHoverHydration } from "./hooks/useHoverHydration";

import { computeEffectiveLayout } from "./utils/computeEffectiveLayout";
import { createViewControls } from "./utils/viewControls";
import { buildCallLocator } from "./utils/buildCallLocator";

import CommandBar from "./ui/CommandBar";
import LeftRail from "./ui/LeftRail";
import GraphMainColumn from "./ui/GraphMainColumn";
import RightControlsColumn from "./ui/RightControlsColumn";
import GuidedTour from "./GuidedTour";
import CommandPalette from "./CommandPalette/CommandPalette";
import { buildCommands } from "./CommandPalette/buildCommands";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import {
  serializeView,
  deserializeView,
  buildShareUrl,
  viewFromUrl,
  readCurrentDestinationId,
} from "./utils/viewUrlState";
import { readSavedViews, addSavedView, removeSavedView } from "./utils/savedViews";

function GraphPage() {
  const { ready, progress, graphName, setGraphName, loadFromStore } = useGraphData();

  const [pendingNav, setPendingNav] = useState(null);
  const [cyInstance, setCyInstance] = useState(null);

  // Tier 3.1 / 3.2 — deep-link URL sync, named saved views, command palette.
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [savedViews, setSavedViews] = useState(() => readSavedViews());
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const [saveDialog, setSaveDialog] = useState({ open: false, name: "" });

  // Lifted from NestedGraphController's renderLevelBar so the Backspace / ← shortcut
  // can drill out a layer even though `onBack` lives inside that render prop.
  const levelNavRef = useRef({ canGoBack: false, onBack: () => {} });

  // Landing redesign: breadcrumb/level DATA lifted out of the nested controller
  // (via GraphMainColumn's LevelBarSync) so the global CommandBar can render it.
  // Click/back callbacks stay out of state (they change identity every controller
  // render) and are read from levelNavRef instead. Survives the controller
  // unmounting (dashboard / detail modes) as a last-known view.
  const [levelBar, setLevelBar] = useState({
    levels: [{ key: "ROOT", title: "EU Funding Programmes" }],
    currentKey: "ROOT",
    canGoBack: false,
  });
  const handleLevelBarChange = useCallback((next) => setLevelBar(next), []);

  // Deep-link hydration bookkeeping (see applyView + the two hydration effects).
  const hydratedRef = useRef(false);
  const hydrationTargetRef = useRef(null);
  const filtersAppliedRef = useRef(false);
  const [applyTick, setApplyTick] = useState(0);

  const hoveredNodeRef = useRef(null);

  const { darkMode, setDarkMode } = useDarkMode();

  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);
  const [isMessageDrawerOpen, setIsMessageDrawerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Compare drawer state
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareNodes, setCompareNodes] = useState([]);

  // Tier 3.3 — the unified Find-calls workspace (graph-mode docked panel).
  const [findOpen, setFindOpen] = useState(false);

  // The three CORDIS exploration tools (B5 research fields, B4 country activity, B6 hop-on) are now hosted in
  // a single distinct dashboard panel instead of pop-up drawers. `dashboardPanel` is the active tool key
  // ("fields" | "country" | "hopOn") or null; clicking the matching sidebar button selects it and navigates
  // to the dashboard.
  const [dashboardPanel, setDashboardPanel] = useState(null);

  // B4: the selected country whose CORDIS activity paints the call nodes. Lifted here (rather than living in
  // the panel) so the graph paint follows the choice when the user switches back to the graph view.
  const [countryOverlayCode, setCountryOverlayCode] = useState("");

  const [graphStats, setGraphStats] = useState({ nodes: 0, edges: 0 });

  const [viewMode, setViewMode] = useState("graph"); // "graph" | "dashboard"

  // Sidebar buttons for the three CORDIS tools: navigate to the dashboard and activate the matching panel
  // tab. Clicking the already-active tool while on the dashboard closes the panel (toggle), mirroring the old
  // drawer toggle behaviour. Also dismiss any inline node-detail overlay, which otherwise renders on top of
  // the dashboard (the click would be a no-op) and would leave the detail's "Back to Graph" button stranding
  // the user on the dashboard.
  const handleSelectDashboardPanel = useCallback(
    (key) => {
      setDashboardPanel((prev) => (prev === key && viewMode === "dashboard" ? null : key));
      setViewMode("dashboard");
      setDetailNode(null);
    },
    [viewMode]
  );

  const [timelineOpen, setTimelineOpen] = useState(true);
  const [timelineSelection, setTimelineSelection] = useState(null);
  // timelineSelection: { start: Date, end: Date } | null (null = show all)

  // Landing redesign: bumping this token pops the AI assistant open (the left
  // rail's sparkle button); the ChatBot otherwise keeps owning its open state.
  const [assistantOpenSignal, setAssistantOpenSignal] = useState(0);
  const handleOpenAssistant = useCallback(() => setAssistantOpenSignal((t) => t + 1), []);

  const { layoutOptions: userLayout, updateOption } = useLayoutOptions();

  const bookmarksCount = useBookmarksCount();

  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const callDetailCacheRef = useRef(new Map()); // callId -> detail JSON

  // NEW: inline node detail state (for NodeDetail overlay)
  const [detailNode, setDetailNode] = useState(null);

  // A3: assistant "act on the graph" state — matched call ids highlighted across
  // every layer, their parent destinations (for the overview), and the single
  // call to center/ring after navigating to it. Focus is a { id, seq } token so
  // re-clicking the SAME result (same id) still re-fires via a bumped seq.
  const [assistantMatchIds, setAssistantMatchIds] = useState(() => new Set());
  const [assistantMatchDestIds, setAssistantMatchDestIds] = useState(() => new Set());
  const [assistantFocus, setAssistantFocus] = useState(null);
  const assistantFocusSeqRef = useRef(0);
  const [assistantQuery, setAssistantQuery] = useState("");
  // Who owns the current graph-highlight ("ai" = chat, "find" = Find-calls panel).
  // The highlight is a single shared channel; the owner lets a sourced clear avoid
  // wiping a highlight another producer set, and the constraint pill label it honestly.
  const [assistantSource, setAssistantSource] = useState("ai");
  const highlightSourceRef = useRef("ai");

  // Memoised call -> graph-location index over the preloaded store. The store is
  // empty until the preload finishes, so build only once `ready` is true.
  const callLocator = useMemo(
    () => (ready ? buildCallLocator(loadFromStore) : { size: 0, locate: () => null }),
    [loadFromStore, ready]
  );

  // Chatbot returned results: highlight every matched call (and its destination).
  const handleAssistantResults = useCallback(
    (matchedCalls, query, source = "ai") => {
      const ids = new Set();
      const destIds = new Set();
      (matchedCalls || []).forEach((c) => {
        const id = c?.identifier;
        if (!id) return;
        ids.add(String(id));
        const loc = callLocator.locate(id);
        if (loc?.destinationId) destIds.add(String(loc.destinationId));
      });
      setAssistantMatchIds(ids);
      setAssistantMatchDestIds(destIds);
      // Keep a just-located focus ring if its call is still in the match set, so
      // live Find re-filtering doesn't cancel a row's center/ring animation.
      setAssistantFocus((prev) => (prev && ids.has(String(prev.id)) ? prev : null));
      setAssistantQuery(query || "");
      setAssistantSource(source);
      highlightSourceRef.current = source;
    },
    [callLocator]
  );

  // A result was clicked: drill the nested graph to the call's layer (without
  // tapping the call open) and mark it for center/ring. Returns false if the
  // call isn't in the loaded graph so the caller can fall back to opening detail.
  const handleLocateCall = useCallback(
    (identifier) => {
      const loc = callLocator.locate(identifier);
      if (!loc) return false;
      assistantFocusSeqRef.current += 1;
      setAssistantFocus({ id: String(identifier), seq: assistantFocusSeqRef.current });
      // Reuse the legend-tree navigation contract (usePendingNav). Omit callId so
      // the call node is NOT tapped (tapping a Call opens the detail overlay).
      setPendingNav(
        loc.destinationId
          ? { clusterKey: loc.clusterKey, destinationId: loc.destinationId }
          : { clusterKey: loc.clusterKey }
      );
      return true;
    },
    [callLocator]
  );

  const handleClearAssistant = useCallback((source = null) => {
    // A sourced clear (e.g. the Find panel closing) only clears a highlight it
    // OWNS — so it can't wipe a chat highlight (or vice-versa). Unsourced clears
    // (Reset all, Escape, the chat's own Clear button) are unconditional.
    if (source && highlightSourceRef.current !== source) return;
    setAssistantMatchIds(new Set());
    setAssistantMatchDestIds(new Set());
    setAssistantFocus(null);
    setAssistantQuery("");
    setAssistantSource("ai");
    highlightSourceRef.current = "ai";
  }, []);

  // 1.2: "Reset All Filters" must clear EVERY filter layer, not just the cy-level
  // node/edge toggles that LegendToggle.resetView() handles. The timeline window and
  // CORDIS country overlay live here in GraphPage, as does the assistant highlight.
  // Clearing each state value lets the declarative paint effects in GraphMainColumn
  // strip their own classes (timeline-hidden / country-* / assistant-*). The score/
  // search ".faded" class has no backing state, so strip it directly as a safety net.
  const handleResetFilters = useCallback(() => {
    setTimelineSelection(null); // timeline window
    setCountryOverlayCode(""); // CORDIS country paint
    handleClearAssistant(); // assistant "act on the graph" highlight
    setCompareNodes([]); // compare selection (2.1: Clear all clears every layer)
    const cy = cyInstance;
    if (cy && !cy.destroyed?.()) {
      try {
        // ".faded" has no backing state; also strip the cosmetic "assistant-focus"
        // ring directly, because clearing assistantFocus cancels the focus effect's
        // pending removal timer without removing the class.
        cy.nodes().removeClass("faded assistant-focus");
        cy.edges().removeClass("faded");
      } catch {}
    }
  }, [cyInstance, handleClearAssistant, setCompareNodes]);

    const handleOpenDetail = useCallback((payload) => {
    // Clear any hover card when opening details
    hoveredNodeRef.current = null;
    setHoveredNode(null);
    setDetailNode(payload || null);
  }, []);

  const handleCloseDetail = useCallback(() => {
    // Inline detail is rendered on top of the already active graph view.
    // So “Back to Graph” should only dismiss the detail overlay and must not
    // mutate graphName / pendingNav, otherwise the parent graph state and the
    // NestedGraphController level stack can drift apart.
    hoveredNodeRef.current = null;
    setHoveredNode(null);
    setDetailNode(null);
  }, []);


  // Clear hover card when the active graph / layer changes
  useEffect(() => {
    hoveredNodeRef.current = null;
    setHoveredNode(null);
    setDetailNode(null); // also close inline detail on dataset change
    setTimelineSelection(null); // reset timeline filter on layer change
    setCompareNodes([]); // reset compare selection on layer change
    // Compare doesn't apply to the flat HE Wiki graph — make sure it isn't left open.
    if (graphName === "HE_2025") {
      setCompareOpen(false);
      setFindOpen(false); // Find calls is cluster/Call-oriented — N/A for the flat HE Wiki graph
      // The CORDIS tool panel is cluster/Call-oriented (research fields, country paint, hop-on hosts) — none
      // apply to the flat HE Wiki graph, so close it and clear any country paint.
      setDashboardPanel(null);
      setCountryOverlayCode("");
    }
  }, [graphName]);

  // (deep-link + pendingNav restore is handled by the mount-hydration effect below,
  // declared after createViewControls so its filter pass runs *after* the
  // reset-on-layer-change effect above.)

  // Compute effective layout (memoized)
  const effectiveLayout = useMemo(() => {
    // HE_2025 uses its own preset directly (layout switcher is disabled for it)
    if (graphName === "HE_2025") return layoutConfig.HE_2025;

    const isTreeLayout = userLayout?.name === "breadthfirst";
    const base = isTreeLayout
      ? layoutConfig.DEFAULT_TREE
      : layoutConfig.DEFAULT;

    return computeEffectiveLayout({ base, userLayout });
  }, [graphName, userLayout]);

  // Pending navigation (cluster -> destination -> call)
  usePendingNav({
    pendingNav,
    setPendingNav,
    cyInstance,
    graphName,
    setGraphName,
  });

  useEffect(() => {
    if (pendingNav == null) localStorage.removeItem("pendingNav");
  }, [pendingNav]);

  // Keep GraphStatusBar counts in sync with Cytoscape
useEffect(() => {
  const cy = cyInstance;
  if (!cy) return;

  const update = () => {
    try {
      setGraphStats({
        nodes: cy.nodes().length,
        edges: cy.edges().length,
      });
    } catch {
      // no-op
    }
  };

  // initial update as soon as cy is ready
  update();

  // update on structure/layout changes
  cy.on("add remove", update);
  cy.on("layoutstop", update);

  // (optional) also update when visibility changes are used instead of add/remove
  cy.on("style", update);

  return () => {
    try {
      cy.off("add remove", update);
      cy.off("layoutstop", update);
      cy.off("style", update);
    } catch {
      // no-op
    }
  };
}, [cyInstance]);


  // Hover hydration (polling)
  useHoverHydration({
    cyInstance,
    graphName,
    hoveredNodeRef,
    setHoveredNode,
    loadFromStore,
    callDetailCacheRef,
  });

  // (The legend is a floating popover now — toggling it no longer resizes the
  // canvas, so the old collapse-refit pass is gone.)

  const { layoutLabel, handleResetView, handleFitView, handleApplyLayout } =
    createViewControls({
      cyInstance,
      effectiveLayout,
    });

  // ── Landing chrome (command bar + left rail) wiring ──────────────────────────

  const inGraphView = viewMode === "graph" && !detailNode;

  // Breadcrumb clicks: in graph view, delegate to the controller's own
  // level-stack slice. From the dashboard or an open node detail the controller
  // is unmounted, so instead leave that mode and re-target the clicked layer —
  // the controller rebuilds to it on remount (same jump the saved-view path uses).
  const handleCrumbClick = useCallback(
    (index) => {
      const onLevelClick = levelNavRef.current?.onLevelClick;
      if (inGraphView && typeof onLevelClick === "function") {
        onLevelClick(index);
        return;
      }
      setDetailNode(null);
      setViewMode("graph");
      const lvl = levelBar.levels?.[index];
      if (!lvl) return;
      const key = String(lvl.key || "");
      const target = key.startsWith("DEST_") ? lvl.graphName : key;
      if (target && target !== graphName) setGraphName(String(target).replace(/_cose$/i, ""));
    },
    [inGraphView, levelBar, graphName, setGraphName]
  );

  const commandBarLayoutMode =
    userLayout?.name === "breadthfirst" ? "breadthfirst" : "cose-bilkent";

  const handleCommandBarLayoutChange = useCallback(
    (nextName) => {
      if (graphName === "HE_2025") return;
      updateOption("name", nextName);
    },
    [graphName, updateOption]
  );

  // Badge on the left rail's filter button = number of active filter layers
  // (mirrors the constraint bar's chips).
  const activeFilterCount =
    (timelineSelection ? 1 : 0) +
    (countryOverlayCode ? 1 : 0) +
    (assistantMatchIds.size > 0 ? 1 : 0) +
    (compareNodes.length > 0 ? 1 : 0);

  // ── Tier 3.1 — deep-link URL sync + named saved views ────────────────────────

  // Apply a serialized view: the location-defining state immediately, then the
  // filter layers once the target programme is the active graph (the second pass
  // below). Shared by mount hydration and "apply saved view".
  const applyView = useCallback(
    (view) => {
      if (!view || typeof view !== "object") return;
      hydrationTargetRef.current = view;
      filtersAppliedRef.current = false;

      setGraphName(view.graphName || "ROOT");
      setViewMode(view.viewMode === "dashboard" ? "dashboard" : "graph");
      setDashboardPanel(view.dashboardPanel || null);
      // Layout isn't subject to the reset-on-layer-change effect, so set it here
      // (default to the force layout when the view omits it) to fully define the view.
      updateOption("name", view.layoutName || "cose-bilkent");

      // Compare isn't part of a serialized view — applying one always clears it.
      setCompareNodes([]);
      setCompareOpen(false);

      if (view.graphName && (view.destinationId || view.callId)) {
        setPendingNav({
          clusterKey: view.graphName,
          ...(view.destinationId ? { destinationId: view.destinationId } : {}),
          ...(view.callId ? { callId: view.callId } : {}),
        });
      }

      // Re-arm the filter pass even when graphName doesn't change.
      setApplyTick((t) => t + 1);
    },
    [setGraphName, updateOption]
  );

  // Snapshot the current view as URL params. Reads the live destination layer from
  // Cytoscape scratch, falling back to a still-pending nav target while drilling.
  const captureCurrentViewParams = useCallback(() => {
    const destFromLayer = readCurrentDestinationId(cyInstance);
    const destinationId = destFromLayer || pendingNav?.destinationId || null;
    return serializeView({
      graphName,
      destinationId,
      viewMode,
      dashboardPanel,
      countryOverlayCode,
      timelineSelection,
      layoutName: userLayout?.name,
    });
  }, [
    cyInstance,
    pendingNav,
    graphName,
    viewMode,
    dashboardPanel,
    countryOverlayCode,
    timelineSelection,
    userLayout?.name,
  ]);

  // Mount: a deep link defines the whole view; otherwise restore the last pendingNav.
  useEffect(() => {
    const view = deserializeView(searchParams);
    if (Object.keys(view).length > 0) {
      applyView(view);
      // Safety net: re-enable URL writes even if the target layer never settles.
      const t = setTimeout(() => {
        hydratedRef.current = true;
      }, 1500);
      return () => clearTimeout(t);
    }
    try {
      const raw = localStorage.getItem("pendingNav");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.clusterKey || parsed.destinationId || parsed.callId)) {
          setPendingNav(parsed);
        }
      }
    } catch {}
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Second hydration pass: paint the filter layers once the target programme is
  // active. Declared after the reset-on-layer-change effect so its writes win
  // within the same commit.
  useEffect(() => {
    const target = hydrationTargetRef.current;
    if (!target || filtersAppliedRef.current) return;
    const wantsProgramme = target.graphName && target.graphName !== "ROOT";
    if (wantsProgramme ? graphName !== target.graphName : graphName !== "ROOT") return;
    filtersAppliedRef.current = true;
    // Authoritative: set OR clear every filter the view (de)serialises, so applying
    // a view that omits a filter wipes any currently-active one. Declared after the
    // reset-on-layer-change effect, so these writes win within the same commit.
    setCountryOverlayCode(target.countryOverlayCode || "");
    setTimelineSelection(target.timelineSelection || null);
    hydratedRef.current = true;
  }, [graphName, applyTick]);

  // Mirror the view into the URL (debounced, replace-history) once hydration settles.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const handle = setTimeout(() => {
      setSearchParams(captureCurrentViewParams(), { replace: true });
    }, 400);
    return () => clearTimeout(handle);
  }, [captureCurrentViewParams, setSearchParams]);

  const handleCopyLink = useCallback(() => {
    const url = buildShareUrl(captureCurrentViewParams());
    const ok = () => setSnackbar({ open: true, message: "Link to this view copied" });
    const fallback = () => setSnackbar({ open: true, message: url });
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url).then(ok).catch(fallback);
      } else {
        fallback();
      }
    } catch {
      fallback();
    }
  }, [captureCurrentViewParams]);

  const handleOpenSaveDialog = useCallback(() => {
    setSaveDialog({ open: true, name: "" });
  }, []);

  const handleConfirmSaveView = useCallback(() => {
    const url = buildShareUrl(captureCurrentViewParams());
    setSavedViews(addSavedView({ name: saveDialog.name, url }));
    setSaveDialog({ open: false, name: "" });
    setSnackbar({ open: true, message: "View saved" });
  }, [captureCurrentViewParams, saveDialog.name]);

  const handleApplySavedView = useCallback(
    (view) => {
      if (!view?.url) return;
      applyView(viewFromUrl(view.url));
    },
    [applyView]
  );

  const handleDeleteSavedView = useCallback((id) => {
    setSavedViews(removeSavedView(id));
  }, []);

  // ── Tier 3.2 — command palette + global keyboard shortcuts ───────────────────
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  const handleEscapeDismiss = useCallback(() => {
    handleClearAssistant();
    setDrawerOpen(false);
    setIsMessageDrawerOpen(false);
    setCompareOpen(false);
    setFindOpen(false);
  }, [handleClearAssistant]);

  const toggleDashboard = useCallback(
    () => setViewMode((v) => (v === "dashboard" ? "graph" : "dashboard")),
    []
  );
  const toggleCompare = useCallback(() => setCompareOpen((p) => !p), []);
  const toggleTimeline = useCallback(() => setTimelineOpen((p) => !p), []);
  const toggleFind = useCallback(() => setFindOpen((p) => !p), []);

  useGlobalShortcuts({
    paletteOpen,
    openPalette,
    closePalette,
    onEscape: handleEscapeDismiss,
    levelNavRef,
    onToggleDashboard: toggleDashboard,
    onToggleCompare: toggleCompare,
    onToggleTimeline: toggleTimeline,
    onToggleFind: toggleFind,
    toolsEnabled: graphName !== "HE_2025",
    inGraphMode: viewMode === "graph" && !detailNode,
  });

  const paletteCommands = useMemo(
    () =>
      buildCommands({
        viewMode,
        isHEWiki: graphName === "HE_2025",
        assistantActive: assistantMatchIds.size > 0,
        countryActive: !!countryOverlayCode,
        timelineActive: !!timelineSelection,
        timelineOpen,
        compareOpen,
        findOpen,
        onToggleFind: toggleFind,
        darkMode,
        setViewMode,
        updateOption,
        onResetView: handleResetView,
        onFitView: handleFitView,
        setCompareOpen,
        setTimelineOpen,
        onSelectDashboardPanel: handleSelectDashboardPanel,
        onResetFilters: handleResetFilters,
        onClearAssistant: handleClearAssistant,
        setCountryOverlayCode,
        setTimelineSelection,
        setDarkMode,
        setDrawerOpen,
        setIsMessageDrawerOpen,
        onCopyLink: handleCopyLink,
        onSaveView: handleOpenSaveDialog,
        onGoToProgramme: (key) => applyView({ graphName: key === "ROOT" ? undefined : key }),
        navigate,
      }),
    [
      viewMode,
      graphName,
      assistantMatchIds,
      countryOverlayCode,
      timelineSelection,
      timelineOpen,
      compareOpen,
      findOpen,
      toggleFind,
      darkMode,
      updateOption,
      applyView,
      handleResetView,
      handleFitView,
      handleSelectDashboardPanel,
      handleResetFilters,
      handleClearAssistant,
      setDarkMode,
      handleCopyLink,
      handleOpenSaveDialog,
      navigate,
    ]
  );

    if (!ready) {
      return (
        <div
          className="d-flex align-items-center justify-content-center flex-column"
          style={{ width: "100vw", height: "100vh" }}
        >
          <Box sx={{ position: "relative", display: "inline-flex" }}>
            <CircularProgress
              variant="determinate"
              value={progress}
              size={80}
              thickness={4}
              color="primary"
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="body2" color="white" fontWeight={600}>
                {progress}%
              </Typography>
            </Box>
          </Box>
          <Typography variant="body2" color="white" sx={{ mt: 2 }}>
            Loading graph data…
          </Typography>
        </div>
      );
    }

  return (
    <CyContext.Provider value={cyInstance}>
      <div className="graph-shell">
        <CommandBar
          levels={levelBar.levels}
          currentKey={levelBar.currentKey}
          onLevelClick={handleCrumbClick}
          viewMode={viewMode}
          setViewMode={setViewMode}
          layoutMode={commandBarLayoutMode}
          layoutSwitchVisible={graphName !== "HE_2025"}
          onLayoutModeChange={handleCommandBarLayoutChange}
          onResetView={handleResetView}
          onFitView={handleFitView}
          onCopyLink={handleCopyLink}
          onSaveView={handleOpenSaveDialog}
          onOpenPalette={openPalette}
          compareOpen={compareOpen}
          compareNodes={compareNodes}
          graphActionsVisible={inGraphView}
        />

        {/* IMPORTANT: keep Bootstrap Container/Row so Col sizing works correctly on mobile */}
        <Container
          fluid
          className="flex-grow-1 d-flex flex-column p-0 graph-container"
          style={{ flexWrap: "nowrap", minWidth: 0, minHeight: 0 }}
        >
          {inGraphView && (
            <LeftRail
              legendOpen={!isLegendCollapsed}
              onToggleLegend={() => setIsLegendCollapsed((p) => !p)}
              filterCount={activeFilterCount}
              compareOpen={compareOpen}
              onToggleCompare={toggleCompare}
              compareDisabled={graphName === "HE_2025"}
              findOpen={findOpen}
              onToggleFind={toggleFind}
              findDisabled={graphName === "HE_2025"}
              onOpenAssistant={handleOpenAssistant}
              hoveredNodeRef={hoveredNodeRef}
              graphName={graphName}
              loadFromStore={loadFromStore}
              onRequestNavigate={(req) => setPendingNav(req)}
              setGraphName={setGraphName}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
              onResetFilters={handleResetFilters}
            />
          )}

          <Row
            className="flex-grow-1 w-100 g-0"
            style={{ flexWrap: "nowrap", minWidth: 0, minHeight: 0 }}
          >
            <GraphMainColumn
              viewMode={viewMode}
              setViewMode={setViewMode}
              graphName={graphName}
              setGraphName={setGraphName}
              loadFromStore={loadFromStore}
              effectiveLayout={effectiveLayout}
              updateOption={updateOption}
              onApplyLayout={handleApplyLayout}
              onGraphStats={setGraphStats}
              onCyReady={setCyInstance}
              onNodeHover={(node) => {
                hoveredNodeRef.current = node || null;
              }}
              hoveredNode={hoveredNode}
              setHoveredNode={setHoveredNode}
              hoveredNodeRef={hoveredNodeRef}
              cyInstance={cyInstance}
              graphStats={graphStats}
              layoutLabel={layoutLabel}
              onResetView={handleResetView}
              onFitView={handleFitView}
              detailNode={detailNode}
              onOpenDetail={handleOpenDetail}
              onCloseDetail={handleCloseDetail}
              timelineOpen={timelineOpen}
              timelineSelection={timelineSelection}
              setTimelineSelection={setTimelineSelection}
              compareOpen={compareOpen}
              setCompareOpen={setCompareOpen}
              compareNodes={compareNodes}
              setCompareNodes={setCompareNodes}
              findOpen={findOpen}
              setFindOpen={setFindOpen}
              dashboardPanel={dashboardPanel}
              setDashboardPanel={setDashboardPanel}
              countryOverlayCode={countryOverlayCode}
              setCountryOverlayCode={setCountryOverlayCode}
              assistantMatchIds={assistantMatchIds}
              assistantMatchDestIds={assistantMatchDestIds}
              assistantFocus={assistantFocus}
              assistantSource={assistantSource}
              onAssistantResults={handleAssistantResults}
              onLocateCall={handleLocateCall}
              onClearAssistant={handleClearAssistant}
              locateCall={callLocator.locate}
              onResetFilters={handleResetFilters}
              assistantQuery={assistantQuery}
              onCopyLink={handleCopyLink}
              onSaveView={handleOpenSaveDialog}
              levelNavRef={levelNavRef}
              navToken={applyTick}
              savedViews={savedViews}
              onApplySavedView={handleApplySavedView}
              onDeleteSavedView={handleDeleteSavedView}
              onLevelBarChange={handleLevelBarChange}
              assistantOpenSignal={assistantOpenSignal}
            />

            <RightControlsColumn
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              isMessageDrawerOpen={isMessageDrawerOpen}
              setIsMessageDrawerOpen={setIsMessageDrawerOpen}
              drawerOpen={drawerOpen}
              setDrawerOpen={setDrawerOpen}
              layoutOptions={effectiveLayout}
              updateOption={updateOption}
              handleApplyLayout={handleApplyLayout}
              bookmarksCount={bookmarksCount}
              timelineOpen={timelineOpen}
              setTimelineOpen={setTimelineOpen}
              compareOpen={compareOpen}
              setCompareOpen={setCompareOpen}
              findOpen={findOpen}
              setFindOpen={setFindOpen}
              viewMode={viewMode}
              dashboardPanel={dashboardPanel}
              onSelectDashboardPanel={handleSelectDashboardPanel}
              graphName={graphName}
              onOpenCommandPalette={openPalette}
            />
          </Row>
        </Container>

        <GuidedTour
          setViewMode={setViewMode}
          setDashboardPanel={setDashboardPanel}
          setIsLegendCollapsed={setIsLegendCollapsed}
        />

        <CommandPalette
          open={paletteOpen}
          onClose={closePalette}
          commands={paletteCommands}
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          message={snackbar.message}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        />

        <Dialog
          open={saveDialog.open}
          onClose={() => setSaveDialog({ open: false, name: "" })}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Save current view</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              margin="dense"
              label="View name"
              placeholder="e.g. CL5 climate calls, autumn 2026"
              value={saveDialog.name}
              onChange={(e) => setSaveDialog((s) => ({ ...s, name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleConfirmSaveView();
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveDialog({ open: false, name: "" })}>Cancel</Button>
            <Button variant="contained" onClick={handleConfirmSaveView}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </CyContext.Provider>
  );
}

export default GraphPage;
