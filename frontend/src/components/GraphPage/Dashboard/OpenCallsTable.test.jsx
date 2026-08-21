import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import OpenCallsTable from "./OpenCallsTable";

// Locks slice 03's contract on the calls surface: truthful statuses (a forthcoming call is
// never labelled Open), programmatic selected state on the filter chips, ARIA-table
// semantics for the collection, no hover-only actions, funding-map terminology (never
// "graph"), and the preserved call-detail / locate-in-map wiring.

const DAY = 24 * 60 * 60 * 1000;
const inDays = (n) => new Date(Date.now() + n * DAY);

const openCall = {
  id: "HORIZON-CL4-2026-DIGITAL-01",
  label: "Open call with a far deadline",
  status: "open",
  openDate: inDays(-30),
  closeDate: inDays(45),
  budget: 12000000,
  programmeLabel: "Cluster 4",
  programmeColor: "#47a9ff",
};

const closingCall = {
  id: "HORIZON-CL4-2026-DIGITAL-02",
  label: "Open call closing in days",
  status: "open",
  openDate: inDays(-60),
  closeDate: inDays(5),
  budget: 8000000,
  programmeLabel: "Cluster 4",
  programmeColor: "#47a9ff",
};

const forthcomingCall = {
  id: "HORIZON-CL4-2026-DIGITAL-03",
  label: "Future call not yet open",
  status: "upcoming",
  openDate: inDays(20),
  closeDate: inDays(90),
  budget: 5000000,
  programmeLabel: "Cluster 4",
  programmeColor: "#47a9ff",
};

function renderTable(overrides = {}) {
  return render(
    <MemoryRouter>
      <OpenCallsTable
        rows={[openCall, closingCall, forthcomingCall]}
        setViewMode={jest.fn()}
        onLocateCall={jest.fn(() => true)}
        locateCall={(id) => true}
        filterLabel={null}
        callFilter={null}
        onSetFilter={jest.fn()}
        openCount={2}
        forthcomingCount={1}
        totalCount={3}
        closingCount={1}
        {...overrides}
      />
    </MemoryRouter>
  );
}

function rowFor(call) {
  const link = screen.getByRole("link", { name: call.label });
  // eslint-disable-next-line testing-library/no-node-access
  return link.closest('[role="row"]');
}

test("a forthcoming (upcoming) call is never labelled Open", () => {
  renderTable();

  const row = rowFor(forthcomingCall);
  expect(within(row).getByText(/forthcoming/i)).toBeInTheDocument();
  expect(within(row).queryByText(/^open$/i)).not.toBeInTheDocument();
  expect(within(row).queryByText(/^closing$/i)).not.toBeInTheDocument();

  // Truly open calls still read Open / Closing (urgency stays textual, not colour-only).
  expect(within(rowFor(openCall)).getByText(/^open$/i)).toBeInTheDocument();
  expect(within(rowFor(closingCall)).getByText(/^closing$/i)).toBeInTheDocument();
});

test("subtitle splits open from forthcoming instead of blending them into one open count", () => {
  renderTable();

  expect(screen.getByText(/2 open · 1 forthcoming/i)).toBeInTheDocument();
  // Honest about the default slice: next N of the full monitored set.
  expect(screen.getByText(/next 3 of 3/i)).toBeInTheDocument();
});

test("filter chips expose programmatic selected state and drive the filter", () => {
  const onSetFilter = jest.fn();
  renderTable({ onSetFilter });

  const next8 = screen.getByRole("button", { name: /next 8/i });
  const closing30 = screen.getByRole("button", { name: /closing 30d/i });
  expect(next8).toHaveAttribute("aria-pressed", "true");
  expect(closing30).toHaveAttribute("aria-pressed", "false");

  fireEvent.click(closing30);
  expect(onSetFilter).toHaveBeenCalledWith("closing30");
});

test("closing-30d filter state is reflected on the chips", () => {
  renderTable({ callFilter: "closing30", filterLabel: "Calls closing in 30 days" });

  expect(screen.getByRole("button", { name: /next 8/i })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  expect(screen.getByRole("button", { name: /closing 30d/i })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("the calls collection is an ARIA table with column headers and rows", () => {
  renderTable();

  const table = screen.getByRole("table", { name: /calls/i });
  const headers = within(table).getAllByRole("columnheader");
  expect(headers.map((h) => h.textContent)).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/call/i),
      expect.stringMatching(/budget/i),
      expect.stringMatching(/deadline/i),
      expect.stringMatching(/status/i),
    ])
  );
  // Header row + one row per call.
  expect(within(table).getAllByRole("row")).toHaveLength(4);
});

test("budget column stays identified as indicative / on offer, never awarded", () => {
  const { container } = renderTable();

  expect(screen.getByText(/indicative · on offer/i)).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/committed|allocated|spent|awarded/i);
});

test("row actions and header action use funding-map terminology, never graph mechanism copy", () => {
  const { container } = renderTable();

  expect(screen.getByRole("button", { name: /view in funding map/i })).toBeInTheDocument();
  expect(
    screen.getAllByRole("button", { name: /show .* in funding map/i }).length
  ).toBeGreaterThan(0);
  // Banned mechanism strings for this dashboard-owned surface (min-test 8, slice share):
  // visible text plus everything assistive technology reads (aria-* and title attributes).
  expect(container.textContent).not.toMatch(/graph/i);
  // eslint-disable-next-line testing-library/no-node-access
  for (const el of container.querySelectorAll("*")) {
    for (const attr of el.attributes) {
      if (attr.name.startsWith("aria-") || attr.name === "title") {
        expect(attr.value).not.toMatch(/graph/i);
      }
    }
  }
});

test("call-detail link and locate-in-funding-map wiring still work", () => {
  const setViewMode = jest.fn();
  const onLocateCall = jest.fn(() => true);
  renderTable({ setViewMode, onLocateCall });

  // Call-detail round trip: the row title links to the node-detail route, and clicking
  // it persists the graph name the return leg restores the dashboard's dataset from.
  const link = screen.getByRole("link", { name: openCall.label });
  expect(link).toHaveAttribute(
    "href",
    `/node/${encodeURIComponent(openCall.id)}`
  );
  fireEvent.click(link);
  expect(localStorage.getItem("graphName")).toBeTruthy();

  // Locate: fires the locate callback and switches to the funding-map view.
  const locate = within(rowFor(openCall)).getByRole("button", {
    name: /show .* in funding map/i,
  });
  fireEvent.click(locate);
  expect(onLocateCall).toHaveBeenCalledWith(openCall.id);
  expect(setViewMode).toHaveBeenCalledWith("graph");

  // Header "View in funding map" switches views too.
  fireEvent.click(screen.getByRole("button", { name: /view in funding map/i }));
  expect(setViewMode).toHaveBeenCalledWith("graph");
});

test("empty state stays honest when no calls match", () => {
  renderTable({ rows: [] });

  expect(screen.getByText(/no calls/i)).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});
