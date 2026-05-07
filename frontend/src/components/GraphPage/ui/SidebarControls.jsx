// src/components/GraphPage/SidebarControls.js
import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import SettingsIcon from "@mui/icons-material/Settings";
import EmailIcon from "@mui/icons-material/Email";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import MessageDrawer from "../../LegendParts/MessageDrawer";
import CustomDrawer from "../../LegendParts/CustomDrawer";
import LayoutControls from "./LayoutControls";
import { useNavigate } from "react-router-dom";

const SidebarControls = ({
  darkMode,
  setDarkMode,
  isMessageDrawerOpen,
  setIsMessageDrawerOpen,
  drawerOpen,
  setDrawerOpen,
  layoutOptions,
  updateOption,
  handleApplyLayout,
  bookmarksCount,
  timelineOpen,
  setTimelineOpen,
  compareOpen,
  setCompareOpen,
}) => {
  const navigate = useNavigate();

  // Re-usable tooltip props so all tooltips look/animate the same
  const tooltipProps = {
    placement: "left",
    arrow: true,
    componentsProps: {
      tooltip: { className: "sidebar-tooltip" },
      arrow: { className: "sidebar-tooltip-arrow" },
    },
  };

  return (
    <div className="sidebar-controls">
      <Tooltip {...tooltipProps} title="Help & Documentation">
        <IconButton
          className="sidebar-controls-button"
          onClick={() => navigate("/about")}
        >
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip {...tooltipProps} title="Switch light / dark mode">
        <IconButton
          className="sidebar-controls-button"
          onClick={() => setDarkMode((prev) => !prev)}
        >
          <Brightness4Icon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip {...tooltipProps} title="View bookmarks">
        <div style={{ position: "relative" }}>
          <IconButton
            className="sidebar-controls-button"
            onClick={() => navigate("/bookmarks")}
          >
            <BookmarkIcon fontSize="small" />
            {bookmarksCount > 0 && (
              <span className="bookmark-badge">{bookmarksCount}</span>
            )}
          </IconButton>
        </div>
      </Tooltip>

      <Tooltip {...tooltipProps} title="Send a message">
        <IconButton
          className="sidebar-controls-button"
          onClick={() => setIsMessageDrawerOpen(true)}
        >
          <EmailIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip {...tooltipProps} title="Timeline scrubber">
        <IconButton
          className={`sidebar-controls-button${timelineOpen ? " sidebar-controls-button--active" : ""}`}
          onClick={() => setTimelineOpen((prev) => !prev)}
        >
          <BarChartOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip {...tooltipProps} title="Compare programmes">
        <IconButton
          className={`sidebar-controls-button${compareOpen ? " sidebar-controls-button--active" : ""}`}
          onClick={() => setCompareOpen((prev) => !prev)}
        >
          <CompareArrowsIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Divider between main tools and settings, as in Figma */}
      <div className="sidebar-controls-divider" />

      <Tooltip {...tooltipProps} title="Graph layout & settings">
        <IconButton
          className="sidebar-controls-button"
          onClick={() => setDrawerOpen(true)}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Drawers stay the same */}
      <MessageDrawer
        anchor="right"
        open={isMessageDrawerOpen}
        onClose={() => setIsMessageDrawerOpen(false)}
        darkMode={darkMode}
      />

      <CustomDrawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        darkMode={darkMode}
      >
        <LayoutControls
          layoutOptions={layoutOptions}
          updateOption={updateOption}
          handleApplyLayout={handleApplyLayout}
        />
      </CustomDrawer>
    </div>
  );
};

export default SidebarControls;
