import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import CordisBand from "./CordisBand";

// Locks the phase-plan Step 3 acceptance criteria: the band renders on every call in
// both states (honest empty pre-ingest, populated post-ingest), carries the ADR-0001
// "in this area" wording, collapses to a one-line summary, and reveals the two launch
// evidence surfaces (A2 projects, B2 organisations) on one tap.

const TITLE = "Funded track record in this area";

const populatedEvidence = {
  loading: false,
  error: null,
  data: {
    call_id: "HORIZON-TEST-01",
    subject: "Building public trust and outreach in the life sciences",
    projectCount: 4023,
    totalEcContribution: 16094713668.41,
    frameworkBreakdown: [{ fp: "HORIZON", n: 4023, funding: 16094713668.41 }],
    topOrganisations: [{ id: "org-1", name: "CNRS", country: "FR", n: 120 }],
    topCountries: [{ country: "DE", orgs: 1947 }],
    provenance: "Funded projects matching this call's subject (CORDIS, FP7-Horizon Europe)",
  },
};

const emptyEvidence = {
  loading: false,
  error: null,
  data: {
    call_id: "HORIZON-MSCA-2026-PF-01-01",
    subject: null,
    projectCount: 0,
    totalEcContribution: 0,
    frameworkBreakdown: [],
    topOrganisations: [],
    topCountries: [],
    provenance: "Funded projects matching this call's subject (CORDIS, FP7-Horizon Europe)",
  },
};

function renderBand(evidence, callId = "HORIZON-TEST-01") {
  return render(
    <MemoryRouter>
      <CordisBand callId={callId} evidence={evidence} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  // B2's hook fetches when the Organisations tab mounts; an empty-but-ok response keeps
  // the panel on its honest bare empty state.
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ organisationCount: 0 }) })
  );
});

afterEach(() => {
  delete global.fetch;
});

test("populated: collapsed by default to the one-line summary", () => {
  renderBand(populatedEvidence);

  expect(screen.getByText(TITLE)).toBeInTheDocument();
  // toLocaleString's thousands separator varies with the test env's locale — accept both.
  expect(
    screen.getByText(/4,?023 funded projects · €16\.1B · top country DE/)
  ).toBeInTheDocument();
  // Collapsed: no tabs, no provenance yet — just the labelled summary and the toggle.
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show" })).toHaveAttribute(
    "aria-expanded",
    "false"
  );
});

test("populated: one tap reveals A2 + B2 (and only those), with source attribution", async () => {
  renderBand(populatedEvidence);

  fireEvent.click(screen.getByRole("button", { name: "Show" }));

  // Exactly the two launch evidence surfaces — A6/B3 are second-wave and must not appear.
  const tabs = screen.getAllByRole("tab");
  expect(tabs.map((t) => t.textContent)).toEqual(["Funded projects", "Organisations"]);

  // ADR-0001 thematic wording + honest scope caveat.
  expect(
    screen.getByText(/EU-funded activity in this call’s research area/)
  ).toBeInTheDocument();

  // CORDIS appears as attribution, naming the subject area the evidence was fetched for.
  expect(screen.getByText(/Source: EU CORDIS/)).toBeInTheDocument();
  expect(
    screen.getByText(/Building public trust and outreach in the life sciences/)
  ).toBeInTheDocument();

  // A2 renders from the already-fetched evidence (no extra fetch for the default tab).
  expect(screen.getByText("Total EU contribution")).toBeInTheDocument();

  // B2 mounts on demand and shows its honest empty state under the mocked empty response.
  fireEvent.click(screen.getByRole("tab", { name: "Organisations" }));
  expect(
    await screen.findByText(/Organisation activity for this research area/)
  ).toBeInTheDocument();

  // Collapses again on demand.
  fireEvent.click(screen.getByRole("button", { name: "Hide" }));
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
});

test("pre-ingest: band stays present with the honest empty line and no dead toggle", () => {
  renderBand(emptyEvidence, "HORIZON-MSCA-2026-PF-01-01");

  expect(screen.getByText(TITLE)).toBeInTheDocument();
  expect(
    screen.getByText("No CORDIS data ingested for this area yet.")
  ).toBeInTheDocument();
  // Nothing behind the line, so no expand affordance (ADR-0006 #2: no inert controls).
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
});

test("loading: labelled band with a checking line, never blank", () => {
  renderBand({ loading: true, error: null, data: null });

  expect(screen.getByText(TITLE)).toBeInTheDocument();
  expect(screen.getByText("Checking the funded track record…")).toBeInTheDocument();
});

test("fetch error: honest unavailable line, not a false 'no data ingested' claim", () => {
  renderBand({ loading: false, error: "HTTP 500", data: null });

  expect(screen.getByText(TITLE)).toBeInTheDocument();
  expect(
    screen.getByText("The funded track record couldn’t be loaded right now.")
  ).toBeInTheDocument();
  expect(screen.queryByText(/No CORDIS data ingested/)).not.toBeInTheDocument();
});
