// src/components/GraphPage/GraphTopBar.js
import React, { useMemo, useState } from "react";
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

const GraphTopBar = ({
  levels,
  currentKey,
  onLevelClick,
  canGoBack,
  onBack,
  onResetView,
  onFitView,
  layoutMode,            // "force" | "tree"
  onLayoutModeChange,    // (mode) => void
  layoutSwitchVisible,   // boolean
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

  const isTree = layoutMode === "tree";

  // Compact breakpoint: covers iPhone SE landscape etc.
  const isCompact = useMediaQuery("(max-width: 1024px), (max-height: 520px)");  // Overflow menu (compact)
  const [menuAnchor, setMenuAnchor] = useState(null);
  const menuOpen = Boolean(menuAnchor);
  const openMenu = (e) => setMenuAnchor(e.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

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

          <Tooltip title={currentTitle}>
            <Typography
              variant="body2"
              component="div"
              className="graph-topbar-compact-title"
            >
              {currentTitle}
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
            {layoutSwitchVisible && (
              <>
                <MenuItem
                  onClick={() => {
                    onLayoutModeChange?.("force");
                    closeMenu();
                  }}
                  selected={!isTree}
                >
                  <GridOnIcon fontSize="small" style={{ marginRight: 10 }} />
                  Force layout
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    onLayoutModeChange?.("tree");
                    closeMenu();
                  }}
                  selected={isTree}
                >
                  <AccountTreeIcon fontSize="small" style={{ marginRight: 10 }} />
                  Hierarchy layout
                </MenuItem>
                <Divider />
              </>
            )}

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
        </Box>
      </Box>
    );
  }

  // Desktop / wide layout: keep your existing breadcrumb UI unchanged
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
                  title={lvl.title}
                >
                  <Typography
                    variant="body2"
                    component="span"
                    className="graph-topbar-breadcrumb-label"
                  >
                    {lvl.title}
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
      </Box>

      <Box className="graph-topbar-actions">
        {layoutSwitchVisible && (
          <>
            <Tooltip title="Force-Directed Layout">
              <IconButton
                size="small"
                className={`graph-topbar-icon${
                  !isTree ? " graph-topbar-icon--active" : ""
                }`}
                color="default"
                onClick={() => onLayoutModeChange?.("force")}
              >
                <GridOnIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Hierarchical Layout">
              <IconButton
                size="small"
                className={`graph-topbar-icon${
                  isTree ? " graph-topbar-icon--active" : ""
                }`}
                color="default"
                onClick={() => onLayoutModeChange?.("tree")}
              >
                <AccountTreeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}

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
