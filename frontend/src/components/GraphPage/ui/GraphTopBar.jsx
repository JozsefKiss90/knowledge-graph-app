import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
} from "@mui/material";

import UndoIcon from "@mui/icons-material/Undo";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import GridOnIcon from "@mui/icons-material/GridOn";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";

function formatLevelTitle(title) {
  if (!title) return "";
  return String(title)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const GraphTopBar = ({
  levels,
  currentKey,
  onLevelClick,
  canGoBack,
  onBack,
  onResetView,
  onFitView,
  layoutMode,
  onLayoutModeChange,
  compareOpen,
  compareNodes,
  viewMode,
  setViewMode,
}) => {
  const currentIndex = Math.max(
    0,
    levels.findIndex((lvl) => lvl.key === currentKey)
  );
  const levelNumber = currentIndex + 1;

  const currentTitle = useMemo(() => {
    const found = levels.find((l) => l.key === currentKey);
    return found?.title || "Graph";
  }, [levels, currentKey]);

  const isTree = layoutMode === "breadthfirst";

  const isCompact = useMediaQuery("(max-width: 1024px), (max-height: 520px)");
  const [menuAnchor, setMenuAnchor] = useState(null);
  const menuOpen = Boolean(menuAnchor);
  const openMenu = (e) => setMenuAnchor(e.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  useEffect(() => {
    setMenuAnchor(null);
  }, [isCompact, currentKey]);

  if (isCompact) {
    return (
      <Box className="graph-topbar graph-topbar--compact">
        <Box className="graph-topbar-compact-left">
          {canGoBack && (
            <Tooltip title="Back one level">
              <IconButton
                size="small"
                className="graph-topbar-icon graph-topbar-compact-back"
                onClick={onBack}
                aria-label="Back one level"
              >
                <ArrowBackIosNewIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Home">
            <IconButton
              size="small"
              className="graph-topbar-icon graph-topbar-compact-home"
              onClick={() => onLevelClick(0)}
              aria-label="Home"
            >
              <HomeOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={formatLevelTitle(currentTitle)}>
            <Typography
              variant="body2"
              component="div"
              className="graph-topbar-compact-title"
            >
              {formatLevelTitle(currentTitle)}
            </Typography>
          </Tooltip>
        </Box>

        <Box className="graph-topbar-compact-right">
          <Box className="graph-topbar-compact-pill" title={`Level ${levelNumber}`}>
            <Typography variant="caption">L{levelNumber}</Typography>
          </Box>

          <Tooltip title="More">
            <IconButton
              size="small"
              className="graph-topbar-icon"
              onClick={openMenu}
              aria-label="More actions"
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={menuAnchor}
            open={menuOpen}
            onClose={closeMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem
              onClick={() => {
                onLayoutModeChange?.("cose-bilkent");
                closeMenu();
              }}
              selected={!isTree}
            >
              <GridOnIcon fontSize="small" style={{ marginRight: 10 }} />
              Force layout
            </MenuItem>

            <MenuItem
              onClick={() => {
                onLayoutModeChange?.("breadthfirst");
                closeMenu();
              }}
              selected={isTree}
            >
              <AccountTreeIcon fontSize="small" style={{ marginRight: 10 }} />
              Hierarchy layout
            </MenuItem>

            <Divider />

            <MenuItem
              onClick={() => {
                onResetView?.();
                closeMenu();
              }}
            >
              <UndoIcon fontSize="small" style={{ marginRight: 10 }} />
              Reset view
            </MenuItem>

            <MenuItem
              onClick={() => {
                onFitView?.();
                closeMenu();
              }}
            >
              <OpenInFullIcon fontSize="small" style={{ marginRight: 10 }} />
              Fit to screen
            </MenuItem>
          </Menu>

          <Tooltip title={viewMode === "dashboard" ? "Back to Graph" : "Open Dashboard"}>
            <IconButton
              size="small"
              className={`graph-topbar-icon${viewMode === "dashboard" ? " graph-topbar-icon--active" : ""}`}
              onClick={() => setViewMode?.(viewMode === "dashboard" ? "graph" : "dashboard")}
              aria-label="Toggle dashboard"
            >
              <DashboardOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="graph-topbar">
      <Box className="graph-topbar-left">
        <button
          type="button"
          className="graph-topbar-breadcrumb graph-topbar-breadcrumb--home"
          onClick={() => onLevelClick(0)}
        >
          <HomeOutlinedIcon fontSize="small" className="graph-topbar-home-icon" />
        </button>

        <Box className="graph-topbar-breadcrumbs">
          {levels.slice(0, currentIndex + 1).map((lvl, index) => {
            if (index === 0) return null;
            const isActive = lvl.key === currentKey;
            return (
              <Box key={lvl.key} className="graph-topbar-breadcrumb-wrapper">
                <ChevronRightIcon className="graph-topbar-separator" />
                <button
                  type="button"
                  className={`graph-topbar-breadcrumb${
                    isActive ? " graph-topbar-breadcrumb--active" : ""
                  }`}
                  onClick={() => onLevelClick(index)}
                  title={formatLevelTitle(lvl.title)}
                >
                  <Typography
                    component="span"
                    className={`graph-topbar-breadcrumb-label level-${index} ${
                      isActive ? "is-active" : ""
                    }`}
                  >
                    {formatLevelTitle(lvl.title)}
                  </Typography>
                </button>
              </Box>
            );
          })}
        </Box>

        <Box className="graph-topbar-level-pill">
          <Typography variant="caption">Level {levelNumber}</Typography>
        </Box>

        {canGoBack && (
          <button
            type="button"
            className="graph-topbar-level-up"
            onClick={onBack}
            aria-label="Back one level"
          >
            Level up
          </button>
        )}

        {compareOpen && compareNodes?.length === 2 && (
          <Box className="graph-topbar-compare-pill">
            <Typography variant="caption">
              Compare: {compareNodes[0]?.label || compareNodes[0]?.name || compareNodes[0]?.id}
              {" > "}
              {compareNodes[1]?.label || compareNodes[1]?.name || compareNodes[1]?.id}
            </Typography>
          </Box>
        )}

      </Box>

      <Box className="graph-topbar-actions">
        <button
          type="button"
          className={`graph-topbar-dash-btn${viewMode === "dashboard" ? " graph-topbar-dash-btn--active" : ""}`}
          onClick={() => setViewMode?.(viewMode === "dashboard" ? "graph" : "dashboard")}
        >
          <DashboardOutlinedIcon className="graph-topbar-dash-btn__icon" />
          <span className="graph-topbar-dash-btn__label">
            {viewMode === "dashboard" ? "Back to Graph" : "Open Dashboard"}
          </span>
        </button>
        <Tooltip title="Force-Directed Layout">
          <IconButton
            size="small"
            className={`graph-topbar-icon${!isTree ? " graph-topbar-icon--active" : ""}`}
            color="default"
            onClick={() => onLayoutModeChange?.("cose-bilkent")}
          >
            <GridOnIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Hierarchical Layout">
          <IconButton
            size="small"
            className={`graph-topbar-icon${isTree ? " graph-topbar-icon--active" : ""}`}
            color="default"
            onClick={() => onLayoutModeChange?.("breadthfirst")}
          >
            <AccountTreeIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Reset view">
          <IconButton size="small" className="graph-topbar-icon" onClick={onResetView}>
            <UndoIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Fit to screen">
          <IconButton size="small" className="graph-topbar-icon" onClick={onFitView}>
            <OpenInFullIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default GraphTopBar;