import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import DeadlineRunway from "./DeadlineRunway";

// Locks slice 04's contract on the runway: the timeline carries an accessible name, and
// everything the dots encode (call names, deadline distances, grouped counts, the
// beyond-horizon overflow) is readable as text — never via SVG, colour, hover or `title`
// alone. The honest empty state stays.

const DAY = 24 * 60 * 60 * 1000;
const inDays = (n) => new Date(Date.now() + n * DAY);

const call = (id, label, days) => ({ id, label, closeDate: inDays(days) });

// The two calls a day apart cluster into a single dot; the far one keeps its own.
const clustered = [
  call("CL4-A", "Trustworthy AI pilots", 12),
  call("CL4-B", "Data spaces for industry", 13),
  call("CL4-C", "Advanced materials for energy", 40),
];

// The runway's textual equivalent, as one string per timeline entry.
function entries() {
  const group = screen.getByRole("group", { name: /deadlines in view/i });
  if (!group.open) {
    fireEvent.click(within(group).getByText(/deadlines in view/i, { selector: "summary" }));
  }
  return within(group)
    .getAllByRole("listitem")
    .map((li) => li.textContent);
}

const entryMatching = (re) => entries().find((t) => re.test(t));

test("the timeline exposes an accessible name summarising the runway", () => {
  render(<DeadlineRunway calls={clustered} />);

  const timeline = screen.getByRole("img", { name: /deadline runway/i });
  // The name carries the shape of the window, not just the widget's name.
  expect(timeline).toHaveAccessibleName(/3 calls/i);
  expect(timeline).toHaveAccessibleName(/week/i);
});

test("call names, deadline distances and grouped counts are readable as text", () => {
  render(<DeadlineRunway calls={clustered} />);

  // Grouped dot: the count and every member name, not a hover-only tooltip.
  const grouped = entryMatching(/2 calls/i);
  expect(grouped).toMatch(/close in 12–13 days/i);
  expect(grouped).toMatch(/Trustworthy AI pilots/i);
  expect(grouped).toMatch(/Data spaces for industry/i);

  // Lone dot: name plus its distance.
  expect(entryMatching(/Advanced materials for energy/i)).toMatch(/in 40 days/i);
});

test("the textual equivalent survives with every title attribute stripped", () => {
  const { container } = render(<DeadlineRunway calls={clustered} />);

  // eslint-disable-next-line testing-library/no-node-access
  container.querySelectorAll("[title]").forEach((el) => el.removeAttribute("title"));

  expect(entryMatching(/Trustworthy AI pilots/i)).toBeTruthy();
  expect(entryMatching(/Advanced materials for energy/i)).toBeTruthy();
});

test("urgency is stated in words, not carried by the amber dot alone", () => {
  render(<DeadlineRunway calls={[call("CL4-D", "Closes very soon", 4)]} />);

  expect(entryMatching(/closing within 10 days/i)).toMatch(/Closes very soon/i);
});

test("calls beyond the visible horizon are reported in text, not only as a pill", () => {
  render(
    <DeadlineRunway
      calls={[call("CL4-A", "Near call", 10), call("CL4-Z", "Far call", 200)]}
    />
  );

  expect(entryMatching(/1 call closes beyond/i)).toBeTruthy();
});

test("the honest empty state is preserved when nothing is upcoming", () => {
  render(<DeadlineRunway calls={[call("CL4-OLD", "Closed call", -30)]} />);

  expect(screen.getByText(/no upcoming deadlines in view/i)).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  // No invented numbers standing in for the missing data.
  expect(screen.queryByText(/next deadline/i)).not.toBeInTheDocument();
});

test("the textual equivalent is reachable by keyboard", () => {
  render(<DeadlineRunway calls={clustered} />);

  const summary = screen.getByText(/deadlines in view/i, { selector: "summary" });
  // A native <summary> is focusable and toggles on Enter/Space without any handler.
  fireEvent.click(summary);
  expect(entries().length).toBeGreaterThan(0);
});
