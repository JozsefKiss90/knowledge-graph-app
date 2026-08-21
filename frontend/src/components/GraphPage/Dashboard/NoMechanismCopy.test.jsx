import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../../../themes/theme";
import PortfolioDashboard from "./PortfolioDashboard";
import { expectNoMechanismCopy } from "./noMechanismCopy";

// The consolidated banned-mechanism-strings sweep (min-test 8): every dashboard-owned surface,
// rendered together in the real PortfolioDashboard, carries no mechanism language — "graph",
// "node", "edge" — in anything an eye or a screen reader picks up. The per-surface tests
// (OpenCallsTable, DashboardToolPanel, ThemeWindows) keep their own focused sweeps of populated
// states; this file is the one place that walks the whole dashboard: the default surface, all
// seven theme windows, and each research tool.

// The dashboard's CORDIS hooks fetch on mount/open; stub them all so the real components — and
// their real copy — render without network. Country gets a populated facet list so the country
// tool's picker copy renders too. `loadFromStore={null}` makes useDashboardData return its inert
// empty shape (the honest empty states are exactly the static copy this sweep must cover).
const mockEmpty = { loading: false, data: null, error: null };
const mockCountry = {
  loading: false,
  error: null,
  data: { facets: { countries: [{ code: "PT", areas: 3 }] }, areas: [], areaCount: 0 },
};
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
jest.mock("../CountryActivity/useCountryActivity", () => ({ __esModule: true, default: () => mockCountry }));
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
          savedViews={[{ id: "v1", name: "My CL4 watch" }]}
          onApplySavedView={jest.fn()}
          onDeleteSavedView={jest.fn()}
          {...props}
        />
      </MemoryRouter>
    </ThemeProvider>
  );
}

test("the default dashboard surface is mechanism-free", () => {
  renderDashboard();
  // The whole document: the dashboard shell plus anything portaled next to it.
  expectNoMechanismCopy(document.body);
});

test("dashboard copy speaks the product vocabulary where mechanism words used to live", () => {
  renderDashboard();
  // The replacements are present, not merely the banned words absent: the research tools
  // describe the funding landscape…
  expect(screen.getByText(/across the funding landscape/i)).toBeInTheDocument();
  // …and the on-offer/funded strip keeps its honest not-ingested line (static evidence copy).
  expect(
    screen.getByText(/funded track record \(CORDIS\) appears here once ingested/i)
  ).toBeInTheDocument();
});

test("all seven theme windows open together are mechanism-free", () => {
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
    fireEvent.click(screen.getByRole("button", { name }));
  }
  expect(screen.getAllByRole("dialog")).toHaveLength(7);

  // Titles, purposes, close-control names, teaser bodies, saved views — the entire document
  // including the portaled window layer.
  expectNoMechanismCopy(document.body);
});

test.each(["fields", "country", "hopOn"])(
  "the %s research tool is mechanism-free inside the dashboard",
  (key) => {
    renderDashboard({ dashboardPanel: key });
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    expectNoMechanismCopy(document.body);
  }
);
