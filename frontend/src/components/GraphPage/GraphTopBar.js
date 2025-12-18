// src/components/GraphPage/GraphTopBar.js
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import GridOnIcon from "@mui/icons-material/GridOn";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

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

  const isTree = layoutMode === "tree";

  return (
    <Box className="graph-topbar">
      {/* LEFT: breadcrumb + Level pill */}
      <Box className="graph-topbar-left">
        {/* Home chip */}
        <button
          type="button"
          className="graph-topbar-breadcrumb graph-topbar-breadcrumb--home"
          onClick={() => onLevelClick(0)}
        >
          <HomeOutlinedIcon fontSize="small" className="graph-topbar-home-icon" />
        </button>

        {/* Separator and crumbs after ROOT */}
        <Box className="graph-topbar-breadcrumbs">
          {levels.slice(0, currentIndex + 1).map((lvl, index) => {
            if (index === 0) return null; // skip ROOT label, we use “AI Research” etc. in lvl.title
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

        {/* Level pill */}
        <Box className="graph-topbar-level-pill">
          <Typography variant="caption">Level {levelNumber}</Typography>
        </Box>

        {/* Optional “up one level” control, aligned with crumbs */}
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
      
      {/* RIGHT: actions (Reset / Fit / Layout) */}
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
          <IconButton
            size="small"
            className="graph-topbar-icon"
            onClick={onResetView}
          >
            <UndoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Fit to screen">
          <IconButton
            size="small"
            className="graph-topbar-icon"
            onClick={onFitView}
          >
            <OpenInFullIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box> 
    </Box>
  );
};

export default GraphTopBar;
  