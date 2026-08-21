import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import CallsOverTime from "./CallsOverTime";

// Locks slice 04's contract on the area chart: an accessible title and summary, monthly
// values exposed as data (not only as an SVG path), Open/Closed mode controls with
// programmatic selected state and keyboard operation (min-test 7), a series that is
// identifiable without colour, and a stated period that matches the months actually shown.

const YEAR = 2026;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Buckets in the shape `bucketCallsByMonth` returns.
const bucket = (m, openCount, upcomingCount, closedCount) => ({
  key: `${YEAR}-${String(m + 1).padStart(2, "0")}`,
  date: new Date(YEAR, m, 1),
  label: MONTHS[m],
  count: openCount + upcomingCount + closedCount,
  openCount,
  upcomingCount,
  closedCount,
  status: "open",
  byProgramme: {},
});

const fullYear = MONTHS.map((_, m) => bucket(m, m + 1, m % 3, 12 - m));

function valuesTable() {
  const disclosure = screen.getByText(/monthly values/i, { selector: "summary" });
  // eslint-disable-next-line testing-library/no-node-access
  if (!disclosure.parentElement.open) fireEvent.click(disclosure);
  return screen.getByRole("table", { name: /calls over time/i });
}

function rowValues(monthLabel) {
  const row = within(valuesTable())
    .getAllByRole("row")
    .find((r) => new RegExp(monthLabel, "i").test(r.textContent));
  return row ? row.textContent : null;
}

test("the chart has an accessible name and a summary description", () => {
  render(<CallsOverTime monthlyBuckets={fullYear} />);

  const chart = screen.getByRole("img", { name: /calls over time/i });
  // The description states which series is drawn and over what period.
  expect(chart).toHaveAccessibleDescription(/open & forthcoming/i);
  expect(chart).toHaveAccessibleDescription(/Jan.*Dec 2026/i);
});

test("monthly values are exposed to assistive technology as data", () => {
  render(<CallsOverTime monthlyBuckets={fullYear} />);

  // Header row + one row per month.
  expect(within(valuesTable()).getAllByRole("row")).toHaveLength(fullYear.length + 1);
  // March: 3 open + 2 forthcoming — the open series counts both, as the label promises.
  expect(rowValues("Mar")).toBe("Mar5");
  // Values follow the selected mode: March's closed count is 10.
  fireEvent.click(screen.getByRole("button", { name: /closed/i }));
  expect(rowValues("Mar")).toBe("Mar10");
});

test("mode controls expose selected state and operate by keyboard", () => {
  render(<CallsOverTime monthlyBuckets={fullYear} />);

  const openBtn = screen.getByRole("button", { name: /open & forthcoming/i });
  const closedBtn = screen.getByRole("button", { name: /closed/i });

  expect(openBtn).toHaveAttribute("aria-pressed", "true");
  expect(closedBtn).toHaveAttribute("aria-pressed", "false");

  // Reachable and operable by keyboard alone: Tab lands on the next control, Enter activates it.
  openBtn.focus();
  userEvent.tab();
  expect(closedBtn).toHaveFocus();
  userEvent.type(closedBtn, "{enter}", { skipClick: true });

  expect(closedBtn).toHaveAttribute("aria-pressed", "true");
  expect(openBtn).toHaveAttribute("aria-pressed", "false");
});

test("the drawn series is identifiable without colour", () => {
  const { container } = render(<CallsOverTime monthlyBuckets={fullYear} />);

  // Named in text, not just tinted.
  expect(screen.getByText(/showing open & forthcoming calls/i)).toBeInTheDocument();

  // eslint-disable-next-line testing-library/no-node-access
  const dash = () => container.querySelector(".dash-calls-time__line").getAttribute("stroke-dasharray");
  const openDash = dash();
  fireEvent.click(screen.getByRole("button", { name: /closed/i }));
  expect(dash()).not.toEqual(openDash);
  expect(screen.getByText(/showing closed calls/i)).toBeInTheDocument();
});

test("the stated period matches the months actually shown", () => {
  // A partial series must not be advertised as a whole year.
  render(<CallsOverTime monthlyBuckets={fullYear.slice(0, 4)} />);

  // The header's period chip states the four months it actually plots.
  expect(screen.getByText("Jan–Apr 2026", { selector: "span" })).toBeInTheDocument();
  expect(screen.queryByText(/Jan–Dec 2026/i)).not.toBeInTheDocument();
  expect(within(valuesTable()).getAllByRole("row")).toHaveLength(5);
});

test("an empty series states that plainly instead of drawing a flat line", () => {
  render(<CallsOverTime monthlyBuckets={[]} />);

  expect(screen.getByText(/no monthly call data/i)).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

test("an all-zero series is named as empty, not summarised as 'highest 0'", () => {
  // The real shape of a quiet series: twelve buckets, nothing in them for this mode.
  render(<CallsOverTime monthlyBuckets={MONTHS.map((_, m) => bucket(m, 0, 0, 0))} />);

  expect(screen.getByText(/no open & forthcoming calls in Jan–Dec 2026/i)).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/highest 0/i);
});

test("series colours come from the theme tokens, so both modes stay defined", () => {
  const { container } = render(<CallsOverTime monthlyBuckets={fullYear} />);

  // eslint-disable-next-line testing-library/no-node-access
  const line = () => container.querySelector(".dash-calls-time__line").style.stroke;
  expect(line()).toMatch(/var\(--d2-open\)/);
  fireEvent.click(screen.getByRole("button", { name: /closed/i }));
  expect(line()).toMatch(/var\(--d2-closed\)/);
});

test("a series crossing a year boundary labels its months unambiguously", () => {
  const crossYear = [
    { ...bucket(10, 3, 0, 1), key: "2026-11", date: new Date(2026, 10, 1) },
    { ...bucket(11, 4, 0, 2), key: "2026-12", date: new Date(2026, 11, 1) },
    { ...bucket(0, 5, 0, 3), key: "2027-01", date: new Date(2027, 0, 1) },
  ];
  render(<CallsOverTime monthlyBuckets={crossYear} />);

  expect(screen.getByText("Nov 2026–Jan 2027", { selector: "span" })).toBeInTheDocument();
  const months = within(valuesTable())
    .getAllByRole("rowheader")
    .map((h) => h.textContent);
  expect(months).toEqual(["Nov '26", "Dec '26", "Jan '27"]);
});
