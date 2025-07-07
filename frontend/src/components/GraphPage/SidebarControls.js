// src/components/GraphPage/SidebarControls.js
import React from "react";
import { IconButton } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import SettingsIcon from "@mui/icons-material/Settings";
import EmailIcon from "@mui/icons-material/Email";
import MessageDrawer from "../LegendParts/MessageDrawer";
import CustomDrawer from "../LegendParts/CustomDrawer";
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
  bookmarksCount, // ← add this
}) => {

  const navigate = useNavigate();

  return (
    <div className="p-0 legend-sidebar d-flex flex-column align-items-center" style={{ width: 60 }}>
      <IconButton className="icon-button" size="large">
        <InfoOutlinedIcon fontSize="large" />
      </IconButton>
      <IconButton className="icon-button" size="large" onClick={() => setDarkMode((prev) => !prev)}>
        <Brightness4Icon fontSize="large" />
      </IconButton>
      <IconButton className="icon-button" size="large">
      <div style={{ position: "relative" }}>
  <IconButton className="icon-button" size="large" onClick={() => navigate("/bookmarks")}>
    <BookmarkIcon fontSize="large" />
    {bookmarksCount > 0 && (
      <span className="bookmark-badge">
        {bookmarksCount}
      </span>
    )}
  </IconButton>
</div>

      </IconButton>
      <IconButton className="icon-button" size="large" onClick={() => setDrawerOpen(true)}>
        <SettingsIcon fontSize="large" />
      </IconButton>
      <IconButton className="icon-button" size="large" onClick={() => setIsMessageDrawerOpen(true)}>
        <EmailIcon fontSize="large" />
      </IconButton>

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
