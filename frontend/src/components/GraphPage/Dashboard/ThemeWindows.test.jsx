import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../../../themes/theme";
import PortfolioDashboard from "./PortfolioDashboard";
import { expectNoMechanismCopy } from "./noMechanismCopy";

// Locks slice 06's contract on the "Explore by theme" floating windows: the layer stays out of
// the way while every window is closed (the sub-lg scrim P0), opening a pill exposes the
// window's title/purpose and moves focus in, Escape closes the active window with focus
// returning to its launcher (min-test 6), close controls carry specific names, and the saved
// tools stay operable inside their window.

// The dashboard's CORDIS hooks fetch on mount/open; stub them all so the real components render
// without network. `loadFromStore={null}` makes useDashboardData return its inert empty shape.
const mockEmpty = { loading: false, data: null, error: null };
jest.mock("./useCordisPortfolio", () => ({ __esModule: true, default: () => mockEmpty }));
jest.mock("./useCordisPortfolioTrend", () => ({ __esModule: true, default: () => mockEmpty }));
jest.mock("./useTopOrganisations", () => ({ __esModule: true, default: () => mockEmpty }));
jest.mock("./useFundingByProgramme", () => ({
  __esModule: true,
  default: () => mockEmpty,
  mapAwardedToProgrammeKeys: () => ({}),
}));
jest.mock("../CordisFields/useCordisFieldTree", () => ({ __esModule: true, default: () => mockEmpty }));
jest.mock("../CordisFields/useCordisFieldCalls", () => ({ __esModule: true, default: () => mockEmpty }));
jest.mock("../CountryActivity/useCountryActivity", () => ({ __esModule: true, default: () => mockEmpty }));
jest.mock("../HopOn/useHopOnHosts", () => ({ __esModule: true, default: () => mockEmpty }));

beforeAll(() => {
  // jsdom has no layout engine, so the tool panel's open-scroll is a no-op here.
  Element.prototype.scrollIntoView = jest.fn();
});

function renderDashboard(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <PortfolioDashboard
          loadFromStore={null}
          graphStats={null}
          setViewMode={jest.fn()}
          dashboardPanel={null}
          setDashboardPanel={jest.fn()}
          countryOverlayCode=""
          setCountryOverlayCode={jest.fn()}
          onLocateCall={jest.fn()}
          locateCall={null}
          savedViews={[]}
          onApplySavedView={jest.fn()}
          onDeleteSavedView={jest.fn()}
          {...props}
        />
      </MemoryRouter>
    </ThemeProvider>
  );
}

const pill = (name) => screen.getByRole("button", { name });

test("the window layer stays out of the document while every theme window is closed", () => {
  renderDashboard();

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  // The portaled layer is what dims and click-blocks the dashboard below lg (the P0 scrim),
  // so with nothing open it must not be mounted at all — not merely be visually empty.
  expect(document.querySelector(".dash-windows-layer")).toBeNull();
});

test("opening a theme pill opens a window that names its purpose and receives focus", () => {
  renderDashboard();

  fireEvent.click(pill(/^Topics/));

  const dialog = screen.getByRole("dialog", { name: "Topics" });
  // Title alone isn't a purpose: AT users get what the window is *for* on open.
  expect(dialog).toHaveAccessibleDescription(/topic/i);
  // Focus moves predictably into the opened window (its labelled container), so the next
  // Tab lands on the window's own content, and Escape has an in-window target.
  expect(dialog).toHaveFocus();

  // The window body scrolls when content overflows, so it must be reachable and scrollable
  // by keyboard: a labelled region holding a tab stop of its own.
  const body = within(dialog).getByRole("region", { name: "Topics" });
  expect(body).toHaveAttribute("tabindex", "0");
});

test("Escape closes the active window and returns focus to its launcher", () => {
  renderDashboard();

  const launcher = pill(/^Topics/);
  fireEvent.click(launcher);
  const dialog = screen.getByRole("dialog", { name: "Topics" });

  fireEvent.keyDown(dialog, { key: "Escape" });

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(launcher).toHaveFocus();
});

test("quick filters and saved views stay operable inside the Saved window", () => {
  renderDashboard();

  fireEvent.click(pill(/^Saved/));
  const dialog = screen.getByRole("dialog", { name: "Saved" });

  // The quick filter is a real toggle wired to the calls table's filter state.
  const filter = within(dialog).getByRole("button", { name: /all open & forthcoming calls/i });
  expect(filter).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(filter);
  expect(
    within(dialog).getByRole("button", { name: /all open & forthcoming calls/i })
  ).toHaveAttribute("aria-pressed", "true");

  // Saved views render their honest empty state rather than disappearing.
  expect(within(dialog).getByText(/no saved views/i)).toBeInTheDocument();
});

test("every theme window opens as its own named dialog with mechanism-free chrome", () => {
  renderDashboard();

  for (const name of [
    /^Funding/,
    /^Funded activity/,
    /^Geography/,
    /^Organisations/,
    /^Fields & topics/,
    /^Topics/,
    /^Saved/,
  ]) {
    fireEvent.click(pill(name));
  }

  const dialogs = screen.getAllByRole("dialog");
  expect(dialogs).toHaveLength(7);
  // The whole portaled layer — titles, purposes, close controls, teaser bodies — must never
  // surface the internal mechanism word.
  expectNoMechanismCopy(document.querySelector(".dash-windows-layer"));
});

test("each window's close control names its window and hands focus back to the launcher", () => {
  renderDashboard();

  const launcher = pill(/^Organisations/);
  fireEvent.click(launcher);
  const dialog = screen.getByRole("dialog", { name: "Organisations" });

  // Specific accessible name — never a bare "×".
  const close = within(dialog).getByRole("button", { name: "Close Organisations" });
  fireEvent.click(close);

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(launcher).toHaveFocus();
});
