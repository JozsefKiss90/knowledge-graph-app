import React from "react";
import { Col } from "react-bootstrap";
import SidebarControls from "./SidebarControls";

export default function RightControlsColumn({
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
}) {
  return (
    <Col xs="auto">
      <SidebarControls
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isMessageDrawerOpen={isMessageDrawerOpen}
        setIsMessageDrawerOpen={setIsMessageDrawerOpen}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        layoutOptions={layoutOptions}
        updateOption={updateOption}
        handleApplyLayout={handleApplyLayout}
        bookmarksCount={bookmarksCount}
        timelineOpen={timelineOpen}
        setTimelineOpen={setTimelineOpen}
      />
    </Col>
  );
}
