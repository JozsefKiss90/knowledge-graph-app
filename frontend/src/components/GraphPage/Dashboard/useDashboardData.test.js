import { renderHook } from "@testing-library/react";
import { useDashboardData } from "./useDashboardData";

// Locks slice 02's honesty contract at the data seam: advertised money is *indicative
// funding on offer* (never committed/allocated/spent/awarded), so the dashboard-owned
// aggregate must carry an on-offer name end-to-end, starting at the producer.

const iso = (d) => d.toISOString().slice(0, 10);
const DAY = 24 * 60 * 60 * 1000;
const pastDate = iso(new Date(Date.now() - 30 * DAY));
const futureDate = iso(new Date(Date.now() + 60 * DAY));

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
    ],
    rels: [],
  },
};

const loadFromStore = (key) => store[key] || null;

const BANNED_KEY = /committed|allocated|spent/i;

test("advertised totals are summed under the on-offer name, never a committed one", () => {
  const { result } = renderHook(() => useDashboardData(loadFromStore));

  expect(result.current.totalOnOffer).toBe(750000000);
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
});
