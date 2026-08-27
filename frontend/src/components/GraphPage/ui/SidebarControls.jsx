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
  LayersIcon,
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

  // The funded-landscape tools (research fields, country activity, hop-on) live in the dashboard tool
  // panel. Q5.2 collapses the rail's three glyphs into ONE labelled shortcut to that landscape section
  // (a labelled shortcut to a canonical place, never a third entry pattern); the individual tools stay
  // reachable as tabs on the panel. It reads "active" whenever any of those tabs is showing.
  const landscapeActive =
    viewMode === "dashboard" && ["fields", "country", "hopOn"].includes(dashboardPanel);

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
          {isExpanded ? <ChevronsRightIcon /> : <ChevronsLeftIcon />}
        </IconButton>
      </Tooltip>

      <SectionDivider label="General" />

      <RailButton
        title="Command palette (Ctrl / ⌘ K)"
        label="Commands"
        onClick={() => onOpenCommandPalette?.()}
      >
        <CommandIcon />
      </RailButton>

      <RailButton title="Help" label="Help" onClick={(e) => setHelpAnchor(e.currentTarget)}>
        <InfoIcon />
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
        <FindCallsIcon />
      </RailButton>

      <RailButton
        title="View bookmarks"
        label="Bookmarks"
        badge={bookmarksCount}
        onClick={() => navigate("/bookmarks")}
      >
        <BookmarkIcon />
      </RailButton>

      <RailButton
        title={isHEWiki ? "Timeline — not available for this dataset" : "Timeline scrubber"}
        label="Timeline"
        active={timelineOpen}
        disabled={isHEWiki}
        onClick={() => setTimelineOpen((prev) => !prev)}
      >
        <TimelineIcon />
      </RailButton>

      <RailButton
        title={isHEWiki ? "Compare — not available for this dataset" : "Compare programmes"}
        label="Compare"
        active={compareOpen}
        disabled={isHEWiki}
        onClick={() => setCompareOpen((prev) => !prev)}
      >
        <ColumnsIcon />
      </RailButton>

      <SectionDivider label="Landscape" />

      {/* Q5.2: one labelled shortcut to the funded-landscape section (research fields, country
          activity and hop-on live as tabs on the dashboard tool panel). Defaults to the field
          explorer — the field-first way in (B5). */}
      <RailButton
        title={
          isHEWiki
            ? "Funded landscape — not available for this dataset"
            : "Funded landscape — explore by research field"
        }
        label="Funded landscape"
        active={landscapeActive}
        disabled={isHEWiki}
        onClick={() => onSelectDashboardPanel("fields")}
      >
        <LayersIcon />
      </RailButton>

      <span className="sidebar-controls-spacer" />

      <SectionDivider label="Settings" />

      <RailButton
        title="Switch light / dark mode"
        label="Theme"
        onClick={() => setDarkMode((prev) => !prev)}
      >
        <MoonIcon />
      </RailButton>

      <RailButton title="Send a message" label="Contact" onClick={() => setIsMessageDrawerOpen(true)}>
        <MailIcon />
      </RailButton>

      <RailButton title="Graph layout & settings" label="Layout & settings" onClick={() => setDrawerOpen(true)}>
        <GearIcon />
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
          onApply={handleApplyLayout}
          onClose={() => setDrawerOpen(false)}
        />
      </CustomDrawer>
    </div>
  );
};

export default SidebarControls;
