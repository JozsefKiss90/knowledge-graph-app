// src/components/GraphPage/ui/SidebarControls.jsx
//
// Docked right toolbar (landing redesign): a full-height rail flush with the
// right edge, running from the command bar to the bottom of the viewport.
// Tool icons sit at the top, utilities are pinned at the foot. Every tool the
// app has stays here (the reference mock omitted some icons — functionality
// wins): command palette, help, find calls, bookmarks, timeline, compare, the
// three CORDIS tools, theme, contact and layout settings.

import React, { useState, useEffect } from "react";
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon } from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import MessageDrawer from "../../LegendParts/MessageDrawer";
import CustomDrawer from "../../LegendParts/CustomDrawer";
import LayoutControls from "./LayoutControls";
import { useNavigate } from "react-router-dom";

import {
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CommandIcon,
  InfoIcon,
  FindCallsIcon,
  BookmarkIcon,
  TimelineIcon,
  ColumnsIcon,
  TreeIcon,
  GlobeIcon,
  PathIcon,
  MoonIcon,
  MailIcon,
  GearIcon,
} from "./railIcons";

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
  findOpen,
  setFindOpen,
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

  // The three CORDIS tools live in the dashboard tool panel: a button is "active" when the dashboard is
  // showing its tab. Clicking navigates to the dashboard and activates the panel (handled in GraphPage).
  const isPanelActive = (key) => viewMode === "dashboard" && dashboardPanel === key;

  const tooltipProps = {
    placement: "left",
    arrow: true,
    componentsProps: {
      tooltip: { className: "sidebar-tooltip" },
      arrow: { className: "sidebar-tooltip-arrow" },
    },
  };

  const SectionDivider = ({ label }) => (
    <div className="sidebar-controls-divider">
      <span className="sidebar-controls-section-label">{label}</span>
    </div>
  );

  const RailButton = ({ title, active, disabled, onClick, label, badge, children }) => (
    <Tooltip {...tooltipProps} title={isExpanded && !disabled ? "" : title}>
      <span className="sidebar-controls-row">
        <IconButton
          className={`sidebar-controls-button${active ? " sidebar-controls-button--active" : ""}`}
          disabled={disabled}
          onClick={onClick}
          aria-label={title}
        >
          {children}
          {badge > 0 && <span className="bookmark-badge">{badge}</span>}
          <span className="sidebar-controls-button__label">{label}</span>
        </IconButton>
      </span>
    </Tooltip>
  );

  return (
    <div className={`sidebar-controls${isExpanded ? " sidebar-controls--expanded" : ""}`}>
      <Tooltip {...tooltipProps} title={isExpanded ? "Collapse" : "Expand"}>
        <IconButton
          className="sidebar-controls-button sidebar-controls-toggle"
          onClick={() => setIsExpanded((p) => !p)}
        >
          {isExpanded ? <ChevronsRightIcon size={15} /> : <ChevronsLeftIcon size={15} />}
        </IconButton>
      </Tooltip>

      <SectionDivider label="General" />

      <RailButton
        title="Command palette (Ctrl / ⌘ K)"
        label="Commands"
        onClick={() => onOpenCommandPalette?.()}
      >
        <CommandIcon size={16} />
      </RailButton>

      <RailButton title="Help" label="Help" onClick={(e) => setHelpAnchor(e.currentTarget)}>
        <InfoIcon size={17} />
      </RailButton>
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

      <SectionDivider label="Explore" />

      <RailButton
        title={
          isHEWiki
            ? "Find calls — not available for this dataset"
            : viewMode !== "graph"
            ? "Find calls — switch to the graph first"
            : "Find calls"
        }
        label="Find calls"
        active={findOpen}
        disabled={isHEWiki || viewMode !== "graph"}
        onClick={() => setFindOpen((prev) => !prev)}
      >
        <FindCallsIcon size={17} />
      </RailButton>

      <RailButton
        title="View bookmarks"
        label="Bookmarks"
        badge={bookmarksCount}
        onClick={() => navigate("/bookmarks")}
      >
        <BookmarkIcon size={16} />
      </RailButton>

      <RailButton
        title={isHEWiki ? "Timeline — not available for this dataset" : "Timeline scrubber"}
        label="Timeline"
        active={timelineOpen}
        disabled={isHEWiki}
        onClick={() => setTimelineOpen((prev) => !prev)}
      >
        <TimelineIcon size={17} />
      </RailButton>

      <RailButton
        title={isHEWiki ? "Compare — not available for this dataset" : "Compare programmes"}
        label="Compare"
        active={compareOpen}
        disabled={isHEWiki}
        onClick={() => setCompareOpen((prev) => !prev)}
      >
        <ColumnsIcon size={16} />
      </RailButton>

      <SectionDivider label="CORDIS tools" />

      <RailButton
        title={isHEWiki ? "Research fields — not available for this dataset" : "Browse research fields"}
        label="Research fields"
        active={isPanelActive("fields")}
        disabled={isHEWiki}
        onClick={() => onSelectDashboardPanel("fields")}
      >
        <TreeIcon size={16} />
      </RailButton>

      <RailButton
        title={isHEWiki ? "Country activity — not available for this dataset" : "Country activity overlay"}
        label="Country activity"
        active={isPanelActive("country")}
        disabled={isHEWiki}
        onClick={() => onSelectDashboardPanel("country")}
      >
        <GlobeIcon size={16} />
      </RailButton>

      <RailButton
        title={isHEWiki ? "Hop-on — not available for this dataset" : "Hop-on opportunities"}
        label="Hop-on"
        active={isPanelActive("hopOn")}
        disabled={isHEWiki}
        onClick={() => onSelectDashboardPanel("hopOn")}
      >
        <PathIcon size={16} />
      </RailButton>

      <span className="sidebar-controls-spacer" />

      <SectionDivider label="Settings" />

      <RailButton
        title="Switch light / dark mode"
        label="Theme"
        onClick={() => setDarkMode((prev) => !prev)}
      >
        <MoonIcon size={16} />
      </RailButton>

      <RailButton title="Send a message" label="Contact" onClick={() => setIsMessageDrawerOpen(true)}>
        <MailIcon size={16} />
      </RailButton>

      <RailButton title="Graph layout & settings" label="Layout & settings" onClick={() => setDrawerOpen(true)}>
        <GearIcon size={16} />
      </RailButton>

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
