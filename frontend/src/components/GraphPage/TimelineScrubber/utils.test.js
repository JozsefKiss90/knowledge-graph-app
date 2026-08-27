import {
  axisTicks,
  bucketCallsByMonth,
  currentPeriodMonths,
  formatMonthShort,
} from "./utils";

const TODAY = new Date("2026-08-27T00:00:00");
const d = (s) => new Date(`${s}T00:00:00`);
const call = (open, close, programme = "Cluster_3") => ({
  openDate: open ? d(open) : null,
  closeDate: close ? d(close) : null,
  programme,
});
const keys = (buckets) => buckets.map((b) => b.key);
const DATA = { today: TODAY, window: "data" };

describe("the month window", () => {
  // The strip covers the work-programme period, because that is what people plan
  // against. Left to the data the top level ran Feb 2022 → Dec 2027: five near-empty
  // years around the two that matter.
  test("defaults to the current work-programme period", () => {
    const buckets = bucketCallsByMonth(
      [call("2022-02-01", "2022-06-01"), call("2026-05-06", "2026-11-05")],
      { today: TODAY }
    );
    expect(buckets).toHaveLength(24);
    expect(buckets[0].key).toBe("2026-01");
    expect(buckets[23].key).toBe("2027-12");
  });

  test("the period holds for both of its years", () => {
    const asYears = (t) => currentPeriodMonths(d(t)).map((mi) => Math.floor(mi / 12));
    expect(asYears("2026-08-27")).toEqual([2026, 2027]);
    expect(asYears("2027-03-01")).toEqual([2026, 2027]); // still 2026–27, not 2027–28
    expect(asYears("2028-01-05")).toEqual([2028, 2029]);
  });

  test("a view with nothing in the period falls back to its own span", () => {
    const buckets = bucketCallsByMonth(
      [call("2022-02-01", "2022-06-01"), call("2023-01-01", "2023-04-01")],
      { today: TODAY }
    );
    expect(buckets[0].key).toBe("2022-02");
    expect(buckets[buckets.length - 1].key).toBe("2023-04");
  });

  test("an empty view still gets a period-shaped strip to read as empty", () => {
    const buckets = bucketCallsByMonth([], { today: TODAY });
    expect(buckets).toHaveLength(24);
    expect(buckets[0].key).toBe("2026-01");
    expect(buckets.every((b) => b.count === 0 && b.status === "empty")).toBe(true);
  });

  test('window: "data" spans every call in view', () => {
    const buckets = bucketCallsByMonth(
      [call("2022-02-01", "2022-06-01"), call("2026-05-06", "2026-11-05")],
      DATA
    );
    expect(buckets[0].key).toBe("2022-02");
    expect(buckets[buckets.length - 1].key).toBe("2026-11");
  });
});

describe("the status split", () => {
  // The bug this locks: the window used to be a hard-coded Jan–Dec of the current year,
  // so a cluster's next-year topics — every one of them Forthcoming — were dropped from
  // the chart while the header still counted them.
  test("next-year calls land in their own months as forthcoming", () => {
    const buckets = bucketCallsByMonth([call("2027-05-05", "2027-11-04")], { today: TODAY });
    const may27 = buckets.find((b) => b.key === "2027-05");

    expect(may27.count).toBe(1);
    expect(may27.upcomingCount).toBe(1);
    expect(may27.openCount).toBe(0);
    expect(may27.status).toBe("upcoming");
  });

  test("status is the call's, resolved once at today, in every month it spans", () => {
    // Open now (May → Nov), so it reads open in the months already behind us too.
    const buckets = bucketCallsByMonth([call("2026-05-06", "2026-11-05")], { today: TODAY });
    expect(buckets.filter((b) => b.openCount === 1)).toHaveLength(7);
    expect(buckets.some((b) => b.closedCount > 0)).toBe(false);

    // Already past its deadline.
    const closed = bucketCallsByMonth([call("2026-01-10", "2026-03-10")], { today: TODAY });
    expect(closed.every((b) => b.openCount === 0 && b.upcomingCount === 0)).toBe(true);
    expect(closed.find((b) => b.key === "2026-02").closedCount).toBe(1);
  });

  test("a call spanning years is counted in each month it is live", () => {
    const buckets = bucketCallsByMonth([call("2026-11-01", "2027-02-15")], DATA);
    expect(keys(buckets)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(buckets.every((b) => b.count === 1)).toBe(true);
  });

  test("programme tallies follow the calls, per month", () => {
    const buckets = bucketCallsByMonth(
      [call("2026-05-06", "2026-06-05", "Cluster_3"), call("2026-06-01", "2026-06-30", "Cluster_4")],
      { today: TODAY }
    );
    expect(buckets.find((b) => b.key === "2026-05").byProgramme).toEqual({ Cluster_3: 1 });
    expect(buckets.find((b) => b.key === "2026-06").byProgramme).toEqual({
      Cluster_3: 1,
      Cluster_4: 1,
    });
  });
});

describe("labels", () => {
  test("months are year-qualified only when the strip crosses a year", () => {
    const oneYear = bucketCallsByMonth([call("2026-03-01", "2026-06-01")], DATA);
    expect(oneYear[0].fullLabel).toBe("MAR");
    expect(oneYear[0].spansYears).toBe(false);

    const twoYears = bucketCallsByMonth([call("2026-11-01", "2027-02-15")], DATA);
    const jan27 = twoYears.find((b) => b.key === "2027-01");
    expect(jan27.isYearStart).toBe(true);
    // Spelled out, not "JAN '27" — an apostrophe-year on a month axis reads as a day.
    expect(jan27.fullLabel).toBe("JAN 2027");
    expect(formatMonthShort(jan27.date)).toBe("JAN");
  });
});

// The axis the user saw on the 60-month top-level strip: "N '23  MAY  SEP  JAN '24 …" —
// a clipped first label, apostrophe-years that read as day numbers, and an every-nth-bar
// rhythm that looked like February and August had gone missing.
describe("axisTicks", () => {
  const fiveYears = bucketCallsByMonth(
    [call("2023-01-15", "2023-04-01"), call("2027-10-01", "2027-12-20")],
    DATA
  );

  test("ticks land on the calendar, so the same months recur every year", () => {
    expect(fiveYears).toHaveLength(60);
    const ticks = axisTicks(fiveYears, 520);
    expect(ticks.map((t) => t.text)).toEqual([
      "2023", "MAY", "SEP",
      "2024", "MAY", "SEP",
      "2025", "MAY", "SEP",
      "2026", "MAY", "SEP",
      "2027", "MAY", "SEP",
    ]);
    // Every tick is a month the ladder allows, never an offset from the first bucket.
    expect(ticks.every((t) => fiveYears[t.index].date.getMonth() % 4 === 0)).toBe(true);
  });

  test("the ladder loosens as the strip narrows and tightens as it widens", () => {
    expect(axisTicks(fiveYears, 1600).length).toBeGreaterThan(axisTicks(fiveYears, 520).length);
    const oneYear = bucketCallsByMonth([call("2026-01-05", "2026-12-20")], DATA);
    expect(axisTicks(oneYear, 640)).toHaveLength(12);
  });

  test("a period strip labels both years and the months between", () => {
    const period = bucketCallsByMonth([call("2026-05-06", "2027-11-04")], { today: TODAY });
    expect(axisTicks(period, 620).map((t) => t.text)).toEqual([
      "2026", "MAR", "MAY", "JUL", "SEP", "NOV",
      "2027", "MAR", "MAY", "JUL", "SEP", "NOV",
    ]);
  });

  test("January carries the year on a multi-year strip and nothing extra on one year", () => {
    expect(axisTicks(fiveYears, 520).find((t) => t.text === "2024").isYear).toBe(true);

    const oneYear = bucketCallsByMonth([call("2026-01-05", "2026-12-20")], DATA);
    const first = axisTicks(oneYear, 640)[0];
    expect(first.text).toBe("JAN");
    expect(first.isYear).toBe(false);
  });

  test("no ticks without buckets or width", () => {
    expect(axisTicks([], 500)).toEqual([]);
    expect(axisTicks(fiveYears, 0)).toEqual([]);
  });
});
