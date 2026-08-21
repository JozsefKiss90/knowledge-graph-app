import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import SidebarControls from "./ui/SidebarControls";
import { buildCommands } from "./CommandPalette/buildCommands";

// The research-tools panel is only reachable through its entry points: the rail's "Funded landscape"
// shortcut and the command palette's three tool commands, both of which hand a tool key to GraphPage's
// `onSelectDashboardPanel` (which sets `dashboardPanel` and switches to the dashboard). Slice 05 reworks
// the panel's internals, so this pins the wiring it must not disturb (min-test 9, this slice's share).

const sidebarProps = (overrides = {}) => ({
  darkMode: true,
  setDarkMode: jest.fn(),
  isMessageDrawerOpen: false,
  setIsMessageDrawerOpen: jest.fn(),
  drawerOpen: false,
  setDrawerOpen: jest.fn(),
  layoutOptions: { name: "cose-bilkent" },
  updateOption: jest.fn(),
  handleApplyLayout: jest.fn(),
  bookmarksCount: 0,
  timelineOpen: false,
  setTimelineOpen: jest.fn(),
  compareOpen: false,
  setCompareOpen: jest.fn(),
  findOpen: false,
  setFindOpen: jest.fn(),
  viewMode: "graph",
  dashboardPanel: null,
  onSelectDashboardPanel: jest.fn(),
  graphName: "Cluster_4",
  onOpenCommandPalette: jest.fn(),
  ...overrides,
});

test("the rail's funded-landscape shortcut opens the research-tools panel on the field explorer", () => {
  const onSelectDashboardPanel = jest.fn();
  render(
    <MemoryRouter>
      <SidebarControls {...sidebarProps({ onSelectDashboardPanel })} />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole("button", { name: /funded landscape/i }));
  expect(onSelectDashboardPanel).toHaveBeenCalledWith("fields");
});

test("the command palette still routes each tool command to its own panel tab", () => {
  const onSelectDashboardPanel = jest.fn();
  const commands = buildCommands({
    viewMode: "graph",
    isHEWiki: false,
    onSelectDashboardPanel,
  });

  const perform = (id) => {
    const cmd = commands.find((c) => c.id === id);
    expect(cmd).toBeDefined();
    expect(cmd.disabled).toBeFalsy();
    cmd.perform();
  };

  perform("tool-fields");
  perform("tool-country");
  perform("tool-hopon");

  expect(onSelectDashboardPanel.mock.calls.map(([key]) => key)).toEqual([
    "fields",
    "country",
    "hopOn",
  ]);
});
