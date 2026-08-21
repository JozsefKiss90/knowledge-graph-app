import { renderHook } from "@testing-library/react";
import { useDashboardData } from "./useDashboardData";

// Locks slice 02's honesty contract at the data seam: advertised money is *indicative
// funding on offer* (never committed/allocated/spent/awarded), so the dashboard-owned
// aggregate must carry an on-offer name end-to-end, starting at the producer.

const iso = (d) => d.toISOString().slice(0, 10);
const DAY = 24 * 60 * 60 * 1000;
const pastDate = iso(new Date(Date.now() - 30 * DAY));
const futureDate = iso(new Date(Date.now() + 60 * DAY));
const soonDate = iso(new Date(Date.now() + 10 * DAY));
const futureOpenDate = iso(new Date(Date.now() + 20 * DAY));
const farFutureDate = iso(new Date(Date.now() + 90 * DAY));

const store = {
  ERC: {
    nodes: [
      {
        id: "call-1",
        type: "Call",
        label: "ERC-2026-STG",
        indicative_budget: "500,000,000",
        opening_date: pastDate,
        deadline: futureDate,
      },
      {
        id: "call-2",
        type: "Call",
        label: "ERC-2026-ADG",
        indicative_budget: "250,000,000",
        opening_date: pastDate,
        deadline: futureDate,
      },
      {
        // Open and closing within 30 days.
        id: "call-3",
        type: "Call",
        label: "ERC-2026-POC",
        indicative_budget: "50,000,000",
        opening_date: pastDate,
        deadline: soonDate,
      },
      {
        // Not yet open — forthcoming, must never count as open.
        id: "call-4",
        type: "Call",
        label: "ERC-2027-STG",
        indicative_budget: "100,000,000",
        opening_date: futureOpenDate,
        deadline: farFutureDate,
      },
    ],
    rels: [],
  },
};

const loadFromStore = (key) => store[key] || null;

const BANNED_KEY = /committed|allocated|spent/i;

test("advertised totals are summed under the on-offer name, never a committed one", () => {
  const { result } = renderHook(() => useDashboardData(loadFromStore));

  expect(result.current.totalOnOffer).toBe(900000000);
  expect(result.current).not.toHaveProperty("totalCommitted");
  const bannedKeys = Object.keys(result.current).filter((k) => BANNED_KEY.test(k));
  expect(bannedKeys).toEqual([]);
});

test("empty-store fallback keeps the on-offer name (no committed key resurfaces)", () => {
  const { result } = renderHook(() => useDashboardData(null));

  expect(result.current.totalOnOffer).toBe(0);
  expect(result.current).not.toHaveProperty("totalCommitted");
  const bannedKeys = Object.keys(result.current).filter((k) => BANNED_KEY.test(k));
  expect(bannedKeys).toEqual([]);
  expect(result.current.forthcomingCalls).toBe(0);
});

// Slice 03: a call whose opening date is in the future is forthcoming, never open —
// the open count must exclude it, and it gets its own honest count.
test("open and forthcoming are counted separately; forthcoming never inflates open", () => {
  const { result } = renderHook(() => useDashboardData(loadFromStore));

  expect(result.current.openCalls).toBe(3);
  expect(result.current.forthcomingCalls).toBe(1);
  const forthcoming = result.current.allCalls.find((c) => c.id === "call-4");
  expect(forthcoming.status).toBe("upcoming");
});

// Min-test 2 (data side): the filter lists keep the expected calls.
test("open and closing-30d filter lists preserve the expected calls", () => {
  const { result } = renderHook(() => useDashboardData(loadFromStore));

  // "All open & forthcoming" — every non-closed call, including the forthcoming one.
  expect(result.current.monitoredCallsList.map((c) => c.id).sort()).toEqual([
    "call-1",
    "call-2",
    "call-3",
    "call-4",
  ]);
  // Closing within 30 days — only the soon-deadline call.
  expect(result.current.closingIn30dList.map((c) => c.id)).toEqual(["call-3"]);
});
