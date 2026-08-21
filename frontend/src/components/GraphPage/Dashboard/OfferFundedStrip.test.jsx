import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import OfferFundedStrip from "./OfferFundedStrip";

// Locks slice 02's honesty contract at the rendered strip: advertised money is visibly
// *indicative / on offer* (never committed), and the CORDIS funded half renders four
// distinct honest states — populated, not-yet-ingested, fetch-failed, loading — never a
// row of funded zeroes and never a false "appears once ingested" claim on a fetch error.

const PENDING_LINE = /appears here once ingested/i;
const FAILED_LINE = /couldn’t be loaded right now/i;
const CHECKING_LINE = /checking the funded track record/i;

const cordisData = {
  projectCount: 101000,
  totalEcContribution: 60000000000,
  organisationCount: 45000,
  countryCount: 130,
  provenance: "Funded projects linked to tracked Horizon Europe calls (CORDIS).",
};

function renderStrip(overrides = {}) {
  return render(
    <OfferFundedStrip
      totalOnOffer={750000000}
      programmeCount={3}
      openCalls={12}
      cordis={null}
      cordisActive={false}
      cordisLoading={false}
      cordisError={null}
      {...overrides}
    />
  );
}

test("advertised total is visibly labelled indicative / on offer, never committed", () => {
  const { container } = renderStrip();

  // The on-offer half wears both halves of the truth: the ON OFFER badge and an
  // explicit "indicative" qualifier on the money figure itself.
  expect(screen.getByText(/^on offer$/i)).toBeInTheDocument();
  expect(screen.getAllByText(/indicative/i).length).toBeGreaterThan(0);
  expect(screen.getByText("€750.0M")).toBeInTheDocument();

  // No committed/allocated/spent wording anywhere in the rendered strip.
  expect(container.textContent).not.toMatch(/committed|allocated|spent/i);
});

test("not-yet-ingested: honest pending line, no funded zeroes", () => {
  const { container } = renderStrip({ cordisActive: false, cordis: null });

  expect(screen.getByText(PENDING_LINE)).toBeInTheDocument();
  // The funded half must not render as zero figures.
  expect(screen.queryByText(/eu awarded/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/projects/i)).not.toBeInTheDocument();
  expect(container.textContent).not.toMatch(/€0\b/);
});

test("fetch failed: distinct unavailable line — not the ingested-pending claim, no zeroes", () => {
  const { container } = renderStrip({ cordisError: "HTTP 500" });

  expect(screen.getByText(FAILED_LINE)).toBeInTheDocument();
  expect(screen.queryByText(PENDING_LINE)).not.toBeInTheDocument();
  expect(screen.queryByText(/eu awarded/i)).not.toBeInTheDocument();
  expect(container.textContent).not.toMatch(/€0\b/);
});

test("loading: checking line, never zeroes masquerading as data", () => {
  const { container } = renderStrip({ cordisLoading: true });

  expect(screen.getByText(CHECKING_LINE)).toBeInTheDocument();
  expect(screen.queryByText(PENDING_LINE)).not.toBeInTheDocument();
  expect(container.textContent).not.toMatch(/€0\b/);
});

test("populated: funded half renders sourced historical figures, separate from on offer", () => {
  renderStrip({ cordisActive: true, cordis: cordisData });

  expect(screen.getByText(/^funded$/i)).toBeInTheDocument();
  expect(screen.getByText("€60.0B")).toBeInTheDocument();
  expect(screen.getByText(/eu awarded/i)).toBeInTheDocument();
  expect(screen.getByText(/source: eu cordis/i)).toBeInTheDocument();
  expect(screen.queryByText(PENDING_LINE)).not.toBeInTheDocument();
  // Both halves visible and badged — the two axes never blend.
  expect(screen.getByText(/^on offer$/i)).toBeInTheDocument();
  expect(screen.getAllByText(/indicative/i).length).toBeGreaterThan(0);
});
