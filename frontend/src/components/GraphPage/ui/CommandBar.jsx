// src/components/GraphPage/ui/CommandBar.jsx
//
// The single slim command bar across the top of the app (landing redesign):
// identity mark · breadcrumbs + level pill · search (opens the command
// palette) · "Open dashboard" · view/layout utility icons.
// Replaces both the old masthead (GraphAppHeader) and the per-column
// GraphTopBar. Breadcrumb state is lifted out of NestedGraphController via
// GraphMainColumn's LevelBarSync.

import React, { useMemo } from "react";
import { Tooltip, useMediaQuery } from "@mui/material";

import {
  LogoMark,
  HomeIcon,
  ChevronRightIcon,
  SearchIcon,
  DashboardIcon,
  GridIcon,
  FlowIcon,
  UndoIcon,
  FitIcon,
  ShareIcon,
  BookmarkPlusIcon,
} from "./railIcons";

function formatLevelTitle(title) {
  if (!title) return "";
  return String(title)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const BarIconButton = ({ title, active, disabled, onClick, children, className = "" }) => (
  <Tooltip title={title} placement="bottom">
    <span>
      <button
        type="button"
        className={`kg-commandbar__icon${active ? " is-active" : ""}${className ? ` ${className}` : ""}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={title}
      >
        {children}
      </button>
    </span>
  </Tooltip>
);

export default function CommandBar({
  levels = [],
  currentKey,
  onLevelClick,
  viewMode,
  setViewMode,
  layoutMode,
  layoutSwitchVisible = true,
  onLayoutModeChange,
  onResetView,
  onFitView,
  onCopyLink,
  onSaveView,
  onOpenPalette,
  compareOpen,
  compareNodes,
  graphActionsVisible: graphActionsVisibleProp,
}) {
  // Compact chrome: below the $bp-lg chrome-collapse breakpoint, or on very short viewports.
  const isCompact = useMediaQuery(
    (theme) => `${theme.breakpoints.down("lg")}, (max-height: 520px)`
  );

  const currentIndex = Math.max(
    0,
    levels.findIndex((lvl) => lvl.key === currentKey)
  );
  const levelNumber = currentIndex + 1;

  const crumbs = useMemo(() => {
    const visible = levels.slice(0, currentIndex + 1);
    // Compact screens: home icon + current level only.
    return isCompact ? visible.slice(-1) : visible;
  }, [levels, currentIndex, isCompact]);

  const isTree = layoutMode === "breadthfirst";
  const inDashboard = viewMode === "dashboard";
  const graphActionsVisible = graphActionsVisibleProp ?? !inDashboard;

  return (
    <div className="kg-commandbar">
      <div className="kg-commandbar__brand">
        <LogoMark size={22} />
        <span className="kg-commandbar__title">EU Knowledge Graph</span>
      </div>

      <span className="kg-commandbar__divider" />

      <Tooltip title="Home" placement="bottom">
        <button
          type="button"
          className="kg-commandbar__icon kg-commandbar__home"
          onClick={() => onLevelClick?.(0)}
          aria-label="Home"
        >
          <HomeIcon size={15} />
        </button>
      </Tooltip>

      <nav className="kg-commandbar__crumbs" aria-label="Graph level breadcrumbs">
        {crumbs.map((lvl, i) => {
          const index = isCompact ? currentIndex : i;
          const isActive = lvl.key === currentKey;
          return (
            <React.Fragment key={lvl.key}>
              <ChevronRightIcon size={12} className="kg-commandbar__crumb-sep" />
              <button
                type="button"
                className={`kg-commandbar__crumb${isActive ? " is-active" : ""}`}
                onClick={() => onLevelClick?.(index)}
                title={formatLevelTitle(lvl.title)}
              >
                {formatLevelTitle(lvl.title)}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      <span className="kg-commandbar__pill">LEVEL {levelNumber}</span>

      {compareOpen && compareNodes?.length === 2 && (
        <span className="kg-commandbar__pill kg-commandbar__pill--compare" title="Comparing">
          {(compareNodes[0]?.label || compareNodes[0]?.name || compareNodes[0]?.id) +
            " ↔ " +
            (compareNodes[1]?.label || compareNodes[1]?.name || compareNodes[1]?.id)}
        </span>
      )}

      <span className="kg-commandbar__spacer" />

      <button
        type="button"
        className="kg-commandbar__search"
        onClick={() => onOpenPalette?.()}
        aria-label="Search calls, topics, programmes"
      >
        <SearchIcon size={14} />
        <span className="kg-commandbar__search-ph">Search calls, topics, programmes…</span>
        <span className="kg-commandbar__kbd">⌘K</span>
      </button>

      <span className="kg-commandbar__divider" />

      <button
        type="button"
        className={`kg-commandbar__dash${inDashboard ? " is-active" : ""}`}
        onClick={() => setViewMode?.(inDashboard ? "graph" : "dashboard")}
      >
        <DashboardIcon size={13} />
        <span className="kg-commandbar__dash-label">
          {inDashboard ? "Back to graph" : "Open dashboard"}
        </span>
      </button>

      <div className="kg-commandbar__cluster">
        {graphActionsVisible && layoutSwitchVisible && (
          <>
            <BarIconButton
              title="Force-directed layout"
              active={!isTree}
              onClick={() => onLayoutModeChange?.("cose-bilkent")}
              className="kg-commandbar__action--secondary"
            >
              <GridIcon size={15} />
            </BarIconButton>
            <BarIconButton
              title="Hierarchical layout"
              active={isTree}
              onClick={() => onLayoutModeChange?.("breadthfirst")}
              className="kg-commandbar__action--secondary"
            >
              <FlowIcon size={15} />
            </BarIconButton>
          </>
        )}
        {graphActionsVisible && (
          <>
            <BarIconButton title="Reset camera" onClick={onResetView}>
              <UndoIcon size={15} />
            </BarIconButton>
            <BarIconButton title="Fit to screen" onClick={onFitView}>
              <FitIcon size={15} />
            </BarIconButton>
          </>
        )}
        {onCopyLink && (
          <BarIconButton
            title="Copy link to this view"
            onClick={onCopyLink}
            className="kg-commandbar__action--secondary"
          >
            <ShareIcon size={15} />
          </BarIconButton>
        )}
        {onSaveView && (
          <BarIconButton
            title="Save this view"
            onClick={onSaveView}
            className="kg-commandbar__action--secondary"
          >
            <BookmarkPlusIcon size={15} />
          </BarIconButton>
        )}
      </div>
    </div>
  );
}
