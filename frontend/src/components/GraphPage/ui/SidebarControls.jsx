// src/components/GraphPage/SidebarControls.js
import React, { useState, useEffect } from "react";
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import SettingsIcon from "@mui/icons-material/Settings";
import EmailIcon from "@mui/icons-material/Email";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PublicIcon from "@mui/icons-material/Public";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import KeyboardCommandKeyIcon from "@mui/icons-material/KeyboardCommandKey";
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
  viewMode,
  dashboardPanel,
  onSelectDashboardPanel,
  graphName,
  onOpenCommandPalette,
}) => {
  const navigate = useNavigate();

  const [isExpanded, setIsExpanded] = useState(() => {
    try { return localStorage.getItem("kg_sidebar_expanded") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("kg_sidebar_expanded", isExpanded ? "1" : "0"); } catch {}
  }, [isExpanded]);
  const [helpAnchor, setHelpAnchor] = useState(null);

  // Compare & Timeline are cluster/Call-oriented; they don't apply to the flat HE Wiki graph.
  const isHEWiki = graphName === "HE_2025";

  // The three CORDIS tools now live in the dashboard tool panel: a button is "active" when the dashboard is
  // showing its tab. Clicking navigates to the dashboard and activates the panel (handled in GraphPage).
  const isPanelActive = (key) => viewMode === "dashboard" && dashboardPanel === key;

  // Re-usable tooltip props so all tooltips look/animate the same
  const tooltipProps = {
    placement: "left",
    arrow: true,
    componentsProps: {
      tooltip: { className: "sidebar-tooltip" },
      arrow: { className: "sidebar-tooltip-arrow" },
    },
  };

  const SectionHeader = ({ label }) => (
    <div className="sidebar-controls-divider"><span className="sidebar-controls-section-label">{label}</span></div>
  );

  return (
    <div className={`sidebar-controls${isExpanded ? " sidebar-controls--expanded" : ""}`}>
      <Tooltip {...tooltipProps} title={isExpanded ? "Collapse" : "Expand"}>
        <IconButton className="sidebar-controls-button sidebar-controls-toggle" onClick={() => setIsExpanded((p) => !p)}>
          {isExpanded ? <KeyboardDoubleArrowRightIcon fontSize="small" /> : <KeyboardDoubleArrowLeftIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      <Tooltip {...tooltipProps} title={isExpanded ? "" : "Command palette (Ctrl / ⌘ K)"}>
        <IconButton
          className="sidebar-controls-button"
          onClick={() => onOpenCommandPalette?.()}
          aria-label="Open command palette"
        >
          <KeyboardCommandKeyIcon fontSize="small" />
          <span className="sidebar-controls-button__label">Commands</span>
        </IconButton>
      </Tooltip>

      <Tooltip {...tooltipProps} title={isExpanded ? "" : "Help"}>
        <IconButton
          className="sidebar-controls-button"
          onClick={(e) => setHelpAnchor(e.currentTarget)}
        >
          <InfoOutlinedIcon fontSize="small" />
          <span className="sidebar-controls-button__label">Help</span>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={helpAnchor}
        open={Boolean(helpAnchor)}
        onClose={() => setHelpAnchor(null)}
        anchorOrigin={{ vertical: "center", horizontal: "left" }}
        transformOrigin={{ vertical: "center", horizontal: "right" }}
      >
        <MenuItem onClick={() => { setHelpAnchor(null); navigate("/?tour=1"); }}>
          <ListItemIcon><PlayCircleOutlineIcon fontSize="small" /></ListItemIcon>
          Restart guided tour
        </MenuItem>
        <MenuItem onClick={() => { setHelpAnchor(null); navigate("/about"); }}>
          <ListItemIcon><MenuBookIcon fontSize="small" /></ListItemIcon>
          Help &amp; docs
        </MenuItem>
      </Menu>

      <SectionHeader label="Explore" />

      <Tooltip {...tooltipProps} title={isExpanded ? "" : "View bookmarks"}>
        <div style={{ position: "relative" }}>
          <IconButton
            className="sidebar-controls-button"
            onClick={() => navigate("/bookmarks")}
          >
            <BookmarkIcon fontSize="small" />
            {bookmarksCount > 0 && (
              <span className="bookmark-badge">{bookmarksCount}</span>
            )}
            <span className="sidebar-controls-button__label">Bookmarks</span>
          </IconButton>
        </div>
      </Tooltip>

      <Tooltip {...tooltipProps} title={isHEWiki ? "Timeline — not available for this dataset" : (isExpanded ? "" : "Timeline scrubber")}>
        <span className="sidebar-controls-row">
          <IconButton
            className={`sidebar-controls-button${timelineOpen ? " sidebar-controls-button--active" : ""}`}
            disabled={isHEWiki}
            onClick={() => setTimelineOpen((prev) => !prev)}
          >
            <BarChartOutlinedIcon fontSize="small" />
            <span className="sidebar-controls-button__label">Timeline</span>
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip {...tooltipProps} title={isHEWiki ? "Compare — not available for this dataset" : (isExpanded ? "" : "Compare programmes")}>
        <span className="sidebar-controls-row">
          <IconButton
            className={`sidebar-controls-button${compareOpen ? " sidebar-controls-button--active" : ""}`}
            disabled={isHEWiki}
            onClick={() => setCompareOpen((prev) => !prev)}
          >
            <CompareArrowsIcon fontSize="small" />
            <span className="sidebar-controls-button__label">Compare</span>
          </IconButton>
        </span>
      </Tooltip>

      <SectionHeader label="CORDIS tools" />

      <Tooltip {...tooltipProps} title={isHEWiki ? "Research fields — not available for this dataset" : (isExpanded ? "" : "Browse research fields")}>
        <span className="sidebar-controls-row">
          <IconButton
            className={`sidebar-controls-button${isPanelActive("fields") ? " sidebar-controls-button--active" : ""}`}
            disabled={isHEWiki}
            onClick={() => onSelectDashboardPanel("fields")}
          >
            <AccountTreeIcon fontSize="small" />
            <span className="sidebar-controls-button__label">Research fields</span>
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip {...tooltipProps} title={isHEWiki ? "Country activity — not available for this dataset" : (isExpanded ? "" : "Country activity overlay")}>
        <span className="sidebar-controls-row">
          <IconButton
            className={`sidebar-controls-button${isPanelActive("country") ? " sidebar-controls-button--active" : ""}`}
            disabled={isHEWiki}
            onClick={() => onSelectDashboardPanel("country")}
          >
            <PublicIcon fontSize="small" />
            <span className="sidebar-controls-button__label">Country activity</span>
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip {...tooltipProps} title={isHEWiki ? "Hop-on — not available for this dataset" : (isExpanded ? "" : "Hop-on opportunities")}>
        <span className="sidebar-controls-row">
          <IconButton
            className={`sidebar-controls-button${isPanelActive("hopOn") ? " sidebar-controls-button--active" : ""}`}
            disabled={isHEWiki}
            onClick={() => onSelectDashboardPanel("hopOn")}
          >
            <GroupAddIcon fontSize="small" />
            <span className="sidebar-controls-button__label">Hop-on</span>
          </IconButton>
        </span>
      </Tooltip>

      <SectionHeader label="Settings" />

      <Tooltip {...tooltipProps} title={isExpanded ? "" : "Switch light / dark mode"}>
        <IconButton
          className="sidebar-controls-button"
          onClick={() => setDarkMode((prev) => !prev)}
        >
          <Brightness4Icon fontSize="small" />
          <span className="sidebar-controls-button__label">Theme</span>
        </IconButton>
      </Tooltip>

      <Tooltip {...tooltipProps} title={isExpanded ? "" : "Send a message"}>
        <IconButton
          className="sidebar-controls-button"
          onClick={() => setIsMessageDrawerOpen(true)}
        >
          <EmailIcon fontSize="small" />
          <span className="sidebar-controls-button__label">Contact</span>
        </IconButton>
      </Tooltip>

      <Tooltip {...tooltipProps} title={isExpanded ? "" : "Graph layout & settings"}>
        <IconButton
          className="sidebar-controls-button"
          onClick={() => setDrawerOpen(true)}
        >
          <SettingsIcon fontSize="small" />
          <span className="sidebar-controls-button__label">Layout &amp; settings</span>
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
