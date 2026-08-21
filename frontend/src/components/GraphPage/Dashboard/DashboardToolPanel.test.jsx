import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import DashboardToolPanel from "./DashboardToolPanel";
import { expectNoMechanismCopy } from "./noMechanismCopy";

// Locks slice 05's contract on the research-tools panel: the full tablist/tab/tabpanel
// relationship with roving tabIndex and arrow/Home/End navigation (min-test 5), predictable
// focus on activation and close, the preserved external panel contract (min-test 9, this
// slice's share) and mechanism-free panel copy (min-test 8, this slice's share).

// The three tools fetch on mount; stub their data hooks so the real components — and their real
// copy — render without network. Country gets a populated facet list so its picker (the
// `setCountry` half of the external contract) is present.
const mockEmpty = { loading: false, data: null, error: null };
const mockCountry = {
  loading: false,
  error: null,
  data: { facets: { countries: [{ code: "PT", areas: 3 }] }, areas: [], areaCount: 0 },
};
jest.mock("../CordisFields/useCordisFieldTree", () => ({ __esModule: true, default: () => mockEmpty }));
jest.mock("../CordisFields/useCordisFieldCalls", () => ({ __esModule: true, default: () => mockEmpty }));
jest.mock("../CountryActivity/useCountryActivity", () => ({ __esModule: true, default: () => mockCountry }));
jest.mock("../HopOn/useHopOnHosts", () => ({ __esModule: true, default: () => mockEmpty }));

beforeAll(() => {
  // jsdom has no layout engine, so the panel's open-scroll is a no-op here.
  Element.prototype.scrollIntoView = jest.fn();
});

function renderPanel(props = {}) {
  const setPanel = jest.fn();
  const setCountry = jest.fn();
  const tree = (extra) => (
    <MemoryRouter>
      <DashboardToolPanel
        panel={null}
        setPanel={setPanel}
        country=""
        setCountry={setCountry}
        {...props}
        {...extra}
      />
    </MemoryRouter>
  );
  const view = render(tree());
  return { ...view, rerender: (next = {}) => view.rerender(tree(next)), setPanel, setCountry };
}

const tab = (name) => screen.getByRole("tab", { name });

test("the tabs are a labelled tablist whose selected tab controls a matching tabpanel", () => {
  renderPanel({ panel: "country" });

  const tablist = screen.getByRole("tablist", { name: /research tools/i });
  const tabs = within(tablist).getAllByRole("tab");
  expect(tabs.map((t) => t.textContent)).toEqual(["Fields", "Country", "Hop-on"]);
  // The strip is icon-only on narrow viewports, so each tab names its tool in full — and that
  // name still contains the visible label.
  expect(tabs.map((t) => t.getAttribute("aria-label"))).toEqual([
    "Research fields",
    "Country activity",
    "Hop-on",
  ]);

  const selected = tab(/country/i);
  expect(selected).toHaveAttribute("aria-selected", "true");
  expect(tab(/fields/i)).toHaveAttribute("aria-selected", "false");
  expect(tab(/hop-on/i)).toHaveAttribute("aria-selected", "false");

  // The selected tab points at the rendered panel, which points back at its tab.
  const panel = screen.getByRole("tabpanel");
  expect(selected).toHaveAttribute("aria-controls", panel.id);
  expect(panel).toHaveAttribute("aria-labelledby", selected.id);
  expect(panel).toHaveAccessibleName(/country/i);
});

test("only one tab is in the tab order (roving tabIndex)", () => {
  const { rerender } = renderPanel();

  // Idle: the strip is still reachable — the first tab holds the tab stop.
  expect(tab(/fields/i)).toHaveAttribute("tabindex", "0");
  expect(tab(/country/i)).toHaveAttribute("tabindex", "-1");

  // Active: the tab stop follows the selected tool.
  rerender({ panel: "hopOn" });
  expect(tab(/hop-on/i)).toHaveAttribute("tabindex", "0");
  expect(tab(/fields/i)).toHaveAttribute("tabindex", "-1");
});

test("Left/Right arrows move focus between tabs without activating them", () => {
  const { setPanel } = renderPanel({ panel: "fields" });

  const fields = tab(/fields/i);
  fields.focus();

  fireEvent.keyDown(fields, { key: "ArrowRight" });
  expect(tab(/country/i)).toHaveFocus();
  expect(tab(/country/i)).toHaveAttribute("tabindex", "0");
  expect(fields).toHaveAttribute("tabindex", "-1");

  // Focus alone must not switch tools — each tool fetches, so activation stays deliberate.
  expect(setPanel).not.toHaveBeenCalled();
  expect(tab(/country/i)).toHaveAttribute("aria-selected", "false");

  // Wraps in both directions.
  fireEvent.keyDown(tab(/country/i), { key: "ArrowLeft" });
  expect(fields).toHaveFocus();
  fireEvent.keyDown(fields, { key: "ArrowLeft" });
  expect(tab(/hop-on/i)).toHaveFocus();
  fireEvent.keyDown(tab(/hop-on/i), { key: "ArrowRight" });
  expect(fields).toHaveFocus();
});

test("Home and End jump to the first and last tab", () => {
  renderPanel({ panel: "country" });

  const country = tab(/country/i);
  country.focus();

  fireEvent.keyDown(country, { key: "End" });
  expect(tab(/hop-on/i)).toHaveFocus();

  fireEvent.keyDown(tab(/hop-on/i), { key: "Home" });
  expect(tab(/fields/i)).toHaveFocus();
});

test("activating a focused tab keeps focus on that tab", () => {
  const { setPanel, rerender } = renderPanel({ panel: "fields" });

  const hopOn = tab(/hop-on/i);
  hopOn.focus();
  fireEvent.click(hopOn); // how a button reports Enter/Space activation
  expect(setPanel).toHaveBeenCalledWith("hopOn");

  rerender({ panel: "hopOn" });
  expect(tab(/hop-on/i)).toHaveFocus();
});

test("closing the panel returns focus to the tab that was showing", () => {
  const { setPanel, rerender } = renderPanel({ panel: "country" });

  fireEvent.click(screen.getByRole("button", { name: /close .*research tools/i }));
  expect(setPanel).toHaveBeenCalledWith(null);

  // The close button unmounts with the panel — focus must land somewhere predictable.
  rerender({ panel: null });
  expect(tab(/country/i)).toHaveFocus();
  expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();
});

test("opening the panel from outside never steals focus, but moves the tab stop", () => {
  // A sidebar / command-palette entry point flips `panel` while holding its own focus.
  const opener = document.createElement("button");
  document.body.appendChild(opener);
  opener.focus();

  const { rerender } = renderPanel({ panel: null });
  rerender({ panel: "hopOn" });

  expect(opener).toHaveFocus();
  // The next Tab therefore lands on the tool that was just opened, not on the first tab.
  expect(tab(/hop-on/i)).toHaveAttribute("tabindex", "0");
  opener.remove();
});

test("a panel restored from the URL does not steal focus on arrival", () => {
  // Nothing is focused on a fresh load, so the panel only scrolls itself into view.
  expect(document.activeElement).toBe(document.body);
  renderPanel({ panel: "country" });

  expect(document.activeElement).toBe(document.body);
  expect(tab(/country/i)).toHaveAttribute("tabindex", "0");
});

test("the panel keeps its external contract: panel/setPanel and country/setCountry", () => {
  const { setPanel, setCountry, rerender } = renderPanel({ panel: "fields" });

  // `panel` alone decides which tool is mounted.
  expect(screen.getByText(/browse EU-funded research fields/i)).toBeInTheDocument();
  rerender({ panel: "hopOn" });
  expect(screen.getByRole("combobox", { name: /not yet a partner/i })).toBeInTheDocument();

  // Tab clicks report the tool key upward; nothing is switched locally.
  fireEvent.click(tab(/fields/i));
  expect(setPanel).toHaveBeenCalledWith("fields");

  // The country tool's selection is still lifted through setCountry.
  rerender({ panel: "country" });
  fireEvent.change(screen.getByRole("combobox", { name: /country/i }), { target: { value: "PT" } });
  expect(setCountry).toHaveBeenCalledWith("PT");
});

test("panel-owned copy names the funding landscape, never the graph mechanism", () => {
  const { container, rerender } = renderPanel({ panel: null });

  // Idle intro (all three tool descriptions).
  expect(screen.getByText(/across the funding landscape/i)).toBeInTheDocument();
  expectNoMechanismCopy(container);

  // And each tool body's own copy.
  for (const key of ["fields", "country", "hopOn"]) {
    rerender({ panel: key });
    expectNoMechanismCopy(container);
  }
});
