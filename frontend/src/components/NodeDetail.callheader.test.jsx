import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../themes/theme";
import NodeDetail from "./NodeDetail";

// Locks the call-detail decision surface: the first hierarchy (programme trail, title, status,
// time remaining), the two halves kept distinguishable without colour, the primary/secondary
// action ranking, and the honesty-contract copy on the money figures.

jest.mock("./context/DarkModeContext", () => ({
  useDarkMode: () => ({ darkMode: true }),
}));

jest.mock("./NodeDetalParts/NodeConnections", () => () => <div data-testid="connections" />);

// The evidence band owns the Awarded half and is tested in CordisBand.test.jsx; here it only
// needs to exist so the two halves can be checked for adjacency and separate labelling.
jest.mock("./GraphPage/CordisEvidence/useCordisEvidence", () => () => ({
  loading: false,
  error: null,
  data: {
    projectCount: 668,
    totalEcContribution: 2046332115.86,
    frameworkBreakdown: [],
    topOrganisations: [],
    topCountries: [{ country: "DE", orgs: 498 }],
    subject: "Boosting creative startups for disruptive innovation",
  },
}));

const CALL = {
  id: "HORIZON-CL2-2026-01-HERITAGE-02",
  type: "Call",
  name: "Boosting creative startups for disruptive innovation",
  identifier: "HORIZON-CL2-2026-01-HERITAGE-02",
  source: "cluster_2",
  group_value: "Innovative Research on European Cultural Heritage",
  call_identifier: "HORIZON-CL2-2026-01",
  call_title: "Culture, Creativity and Inclusive Society 2026",
  type_of_action: "HORIZON-IA HORIZON Innovation Actions",
  opening_date: "2026-05-12",
  // The same day in two encodings — the source data really does carry both.
  deadline: "2026-09-23T00:00:00+00:00",
  deadlines: ["2026-09-23"],
  min_contribution: 5000000,
  max_contribution: 6000000,
  indicative_budget: 12000000,
  indicative_number_of_projects: 2,
  related_topics: ["business models", "arts"],
  cordis_tag_source: "Research fields of EU-funded projects on this subject",
};

function renderCall(overrides = {}) {
  const nodeData = { ...CALL, ...overrides };
  currentNode = nodeData;
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <NodeDetail embeddedId={nodeData.id} embeddedNodeData={nodeData} onBack={() => {}} />
      </MemoryRouter>
    </ThemeProvider>
  );
}

let currentNode = CALL;

beforeEach(() => {
  localStorage.clear();
  currentNode = CALL;
  // useNodeDetail refetches the node even when it is seeded, so the mock has to answer per
  // endpoint: a blanket {relationships: []} would overwrite nodeData with an empty object.
  global.fetch = jest.fn((url) =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve(
          String(url).includes("/relationships") ? { relationships: [] } : currentNode
        ),
    })
  );
  // Fixed "today" so the day counts below are deterministic; real time still advances so the
  // component's own async work resolves.
  jest.useFakeTimers({ now: new Date("2026-08-13T09:00:00Z"), doNotFake: ["queueMicrotask"] });
});

afterEach(() => {
  jest.useRealTimers();
  delete global.fetch;
});

test("first hierarchy: programme trail, title, status and time remaining", async () => {
  renderCall();

  const heading = await screen.findByRole("heading", { level: 1 });
  expect(heading).toHaveTextContent("Boosting creative startups for disruptive innovation");

  // Where this call sits in the work programme — previously absent from the whole first screen.
  const trail = screen.getByRole("navigation", { name: /work programme location/i });
  expect(trail).toHaveTextContent("Cluster 2");
  expect(trail).toHaveTextContent("Innovative Research on European Cultural Heritage");
  expect(trail).toHaveTextContent("HORIZON-CL2-2026-01");

  // Status carries a word, not only a colour.
  expect(screen.getByText("Open")).toBeInTheDocument();

  // The read the decision turns on: 2026-08-13 -> 2026-09-23 is 41 days.
  expect(screen.getByText(/Closes in 41 days · 23 Sep(t)? 2026/)).toBeInTheDocument();
});

test("the two halves are labelled and badged, so colour is never the only channel", async () => {
  renderCall();
  await screen.findByRole("heading", { level: 1 });

  const offerHead = screen.getByRole("heading", { name: "On offer" });
  const offerHalf = offerHead.closest(".nd-callhead__half");
  expect(within(offerHalf).getByText("Indicative · on offer")).toBeInTheDocument();

  // The Awarded half keeps its sanctioned title and its own badge.
  expect(
    screen.getByRole("heading", { name: "Funded track record in this area" })
  ).toBeInTheDocument();
  expect(screen.getByText("Awarded · CORDIS")).toBeInTheDocument();

  // ADR-0001: the thematic qualifier travels with the figure instead of hiding behind the toggle.
  expect(
    screen.getByText(/In this call’s research area — not funded by this call\./)
  ).toBeInTheDocument();
});

test("money copy stays on the advertised side of the honesty contract", async () => {
  renderCall();
  await screen.findByRole("heading", { level: 1 });

  // Q6.2 / ADR-0006 #5 — the mandated wording, and none of the banned alternatives.
  expect(screen.getAllByText("Indicative budget on offer").length).toBeGreaterThan(0);
  expect(screen.getByText("€12.0M")).toBeInTheDocument();
  expect(screen.getByText("€5.0M – €6.0M")).toBeInTheDocument();

  const shell = document.body.textContent;
  expect(shell).not.toMatch(/Total committed|committed budget|allocated|money spent/i);
  // No odds, ever (ADR-0006 #4).
  expect(shell).not.toMatch(/success rate|funded rate|win rate|probability|odds/i);
});

test("a deadline encoded twice renders once", async () => {
  renderCall();
  await screen.findByRole("heading", { level: 1 });

  const dates = screen.getAllByText(/23 Sep(t)? 2026/);
  // One in the "Closes in…" line, one in the Timeline half — and no duplicate Timeline row.
  expect(dates).toHaveLength(2);
  expect(screen.getByText("Deadline")).toBeInTheDocument();
  expect(screen.queryByText("Deadlines")).not.toBeInTheDocument();
});

test("official call page is primary and named; bookmark is secondary and stateful", async () => {
  const open = jest.fn();
  window.open = open;

  renderCall();
  await screen.findByRole("heading", { level: 1 });

  const official = screen.getByRole("button", { name: /Open the official call page/i });
  expect(official).toHaveClass("nd-cta--primary");
  fireEvent.click(official);
  expect(open).toHaveBeenCalledWith(
    "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/HORIZON-CL2-2026-01-HERITAGE-02",
    "_blank",
    "noopener,noreferrer"
  );

  const bookmark = screen.getByRole("button", { name: "Bookmark this call" });
  expect(bookmark).toHaveClass("nd-cta--secondary");
  expect(bookmark).toHaveAttribute("aria-pressed", "false");

  fireEvent.click(bookmark);

  expect(JSON.parse(localStorage.getItem("bookmarkedCalls"))).toEqual([
    { id: CALL.id, name: CALL.name },
  ]);
  expect(
    screen.getByRole("button", { name: /Bookmarked — already saved/i })
  ).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("status")).toHaveTextContent("Bookmarked.");
});

test("research fields are inert metadata when nothing is wired to them", async () => {
  renderCall();
  await screen.findByRole("heading", { level: 1 });

  expect(screen.getByText("business models")).toBeInTheDocument();
  // ADR-0006 #2: no control that does nothing.
  expect(screen.queryByRole("button", { name: /Explore the research field/i })).not.toBeInTheDocument();
});

test("research fields become real controls when a handler is passed", async () => {
  const onOpenResearchFields = jest.fn();
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <NodeDetail
          embeddedId={CALL.id}
          embeddedNodeData={CALL}
          onBack={() => {}}
          onOpenResearchFields={onOpenResearchFields}
        />
      </MemoryRouter>
    </ThemeProvider>
  );
  await screen.findByRole("heading", { level: 1 });

  fireEvent.click(screen.getByRole("button", { name: "Explore the research field arts" }));
  expect(onOpenResearchFields).toHaveBeenCalledWith("arts");
});

test("a forthcoming call reads as opening, not closing", async () => {
  renderCall({
    opening_date: "2026-08-25",
    deadline: "2026-11-26T00:00:00+00:00",
    deadlines: ["2026-11-26"],
  });
  await screen.findByRole("heading", { level: 1 });

  expect(screen.getByText("Forthcoming")).toBeInTheDocument();
  expect(screen.getByText(/Opens in 12 days · 25 Aug 2026/)).toBeInTheDocument();
});

test("an unstated project count is left unstated, never derived", async () => {
  renderCall({
    indicative_number_of_projects: undefined,
    expected_eu_contribution: "6 million",
  });
  await screen.findByRole("heading", { level: 1 });

  // budget / expected-contribution would have produced "2"; ADR-0006 #1 admits no extrapolation.
  expect(screen.queryByText("Projects expected")).not.toBeInTheDocument();
  expect(screen.getByText("Not stated")).toBeInTheDocument();
});

test("every interactive control on the surface has an accessible name", async () => {
  renderCall();
  await screen.findByRole("heading", { level: 1 });

  const buttons = screen.getAllByRole("button");
  expect(buttons.length).toBeGreaterThan(3);
  buttons.forEach((b) => {
    const name = b.getAttribute("aria-label") || b.textContent;
    expect(String(name).trim()).not.toBe("");
  });

  // Section toggles name what they govern rather than eleven identical "Show"s.
  expect(screen.getByRole("button", { name: /the funded track record in this area/i })).toBeInTheDocument();
});
