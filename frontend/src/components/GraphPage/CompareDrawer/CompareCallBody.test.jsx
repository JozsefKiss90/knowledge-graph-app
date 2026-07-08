import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CompareCallBody from "./CompareCallBody";

// Locks the phase-plan Step 6 acceptance: two shortlisted calls compare side by side with their
// advertised deadline/budget AND their A2 funded-track-record evidence, with the honesty contract
// intact (ADR-0001 "in this area" wording, Advertised/Awarded half-badges, honest empty states).

const callA = {
  node: { id: "HORIZON-A", label: "Clean hydrogen for industry", type: "Call" },
  metrics: {
    status: "Open",
    deadline: new Date(2026, 3, 16), // 16 Apr 2026 (local — tz-independent)
    openDate: new Date(2025, 11, 1),
    budget: 50_000_000,
    typeOfAction: "HORIZON Research and Innovation Actions",
    identifier: "HORIZON-A",
  },
  evidence: {
    loading: false,
    error: null,
    data: { projectCount: 4023, totalEcContribution: 16094713668.41 },
  },
};

const callB = {
  node: { id: "HORIZON-B", label: "Grid-scale storage pilots", type: "Call" },
  metrics: {
    status: "Forthcoming",
    deadline: new Date(2026, 8, 12), // 12 Sep 2026
    openDate: new Date(2026, 5, 1),
    budget: 30_000_000,
    typeOfAction: "Innovation Action",
    identifier: "HORIZON-B",
  },
  evidence: {
    loading: false,
    error: null,
    data: { projectCount: 128, totalEcContribution: 402_000_000 },
  },
};

test("populated: advertised facts + A2 evidence side by side, with both half-badges", () => {
  render(<CompareCallBody callA={callA} callB={callB} onClearNode={() => {}} />);

  // Advertised deadline/budget — the mandated compare set (UX-DECISIONS Q4.3).
  expect(screen.getByText("16 Apr 2026")).toBeInTheDocument();
  expect(screen.getByText("12 Sep 2026")).toBeInTheDocument();
  expect(screen.getByText("€50.0M")).toBeInTheDocument();
  expect(screen.getByText("€30.0M")).toBeInTheDocument();
  // Status + short type of action support the "worth it" read.
  expect(screen.getByText("Open")).toBeInTheDocument();
  expect(screen.getByText("Forthcoming")).toBeInTheDocument();
  expect(screen.getAllByText("RIA").length).toBeGreaterThan(0);

  // The evidence half — ADR-0001 thematic wording, verbatim.
  expect(screen.getByText("Funded track record in this area")).toBeInTheDocument();
  expect(screen.getByText(/4,?023/)).toBeInTheDocument();
  expect(screen.getByText("€16.1B")).toBeInTheDocument();
  expect(screen.getByText("€402.0M")).toBeInTheDocument();

  // Both money halves are labelled (ADR-0006 #5) and the CORDIS source is attributed.
  expect(screen.getByText("Indicative · on offer")).toBeInTheDocument();
  expect(screen.getByText("Awarded · CORDIS")).toBeInTheDocument();
  expect(screen.getByText(/Source: EU CORDIS/)).toBeInTheDocument();
});

test("pre-ingest call: honest 'None yet', never a fabricated euro figure", () => {
  const emptyEvidence = {
    loading: false,
    error: null,
    data: { projectCount: 0, totalEcContribution: 0 },
  };
  const a = { ...callA, evidence: emptyEvidence };
  const b = { ...callB, evidence: emptyEvidence };

  render(<CompareCallBody callA={a} callB={b} onClearNode={() => {}} />);

  // Band still present (labelled), evidence honestly empty — no invented projects/euros.
  expect(screen.getByText("Funded track record in this area")).toBeInTheDocument();
  expect(screen.getAllByText("None yet").length).toBe(2);
  expect(screen.queryByText(/€16\.1B/)).not.toBeInTheDocument();
});

test("loading evidence: a checking slot, never blank or a false number", () => {
  const loadingEvidence = { loading: true, error: null, data: null };
  const a = { ...callA, evidence: loadingEvidence };
  const b = { ...callB, evidence: loadingEvidence };

  render(<CompareCallBody callA={a} callB={b} onClearNode={() => {}} />);

  // Two evidence rows (FUNDED PROJECTS, AWARDED) × two columns, all still resolving.
  expect(screen.getAllByText("…").length).toBe(4);
});
