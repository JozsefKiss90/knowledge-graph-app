/**
 * Timeline scrubber date utilities.
 */

/** Display config for programmes at every layer (colours + labels for popover). */
export const PROGRAMME_DISPLAY = {
  /* ── Level 1: top-level programmes (ROOT view) ── */
  HE:      { label: "Horizon Europe",              color: "#22C55E" },
  DEP:     { label: "Digital Europe",               color: "#60A5FA" },
  ERASMUS: { label: "Erasmus+",                     color: "#A78BFA" },
  CEF:     { label: "Connecting Europe Facility",    color: "#FBBF24" },
  CREA:    { label: "Creative Europe",              color: "#F472B6" },
  EURATOM: { label: "EURATOM",                      color: "#22D3EE" },

  /* ── Level 2+: HE Pillar I – Excellent Science ── */
  ERC:     { label: "ERC",                          color: "#38BDF8" },
  MSCA:    { label: "MSCA",                         color: "#818CF8" },
  INFRA:   { label: "Research Infra.",              color: "#2DD4BF" },

  /* ── Level 2+: HE Pillar II – Global Challenges ── */
  Cluster_1: { label: "CL1 – Health",              color: "#F87171" },
  Cluster_2: { label: "CL2 – Culture",             color: "#FB923C" },
  Cluster_3: { label: "CL3 – Security",            color: "#FBBF24" },
  Cluster_4: { label: "CL4 – Digital",             color: "#A3E635" },
  Cluster_5: { label: "CL5 – Climate",             color: "#34D399" },
  Cluster_6: { label: "CL6 – Food & Bio",          color: "#22D3EE" },
  MISS:      { label: "Missions",                  color: "#E879F9" },

  /* ── Level 2+: HE Pillar III – Innovative Europe ── */
  EIC:     { label: "EIC",                          color: "#C084FC" },
  EIE:     { label: "EIE",                          color: "#F472B6" },

  /* ── Cross-cutting ── */
  WIDERA:  { label: "WIDERA",                       color: "#FB7185" },
};

/** Try to parse a date string into a Date. Returns null on failure. */
export function parseCallDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const s = String(value).trim();
  if (!s) return null;

  // ISO-ish: "2025-05-16" or "2025-05-16T..."
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const parsed = new Date(`${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

/** Parse a deadlines field that may be a JSON-stringified array or a real array. */
function parseDeadlinesField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    // Neo4j stores arrays as JSON strings, e.g. '["2026-04-16"]'
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // single value string
      return [val];
    }
  }
  return [];
}

/** Extract { openDate, closeDate } from a call node's data. */
export function getCallDateRange(node) {
  if (!node) return null;

  const openDate = parseCallDate(
    node.opening_date ?? node.openingDate ?? node.start_date ?? node.startDate
  );

  let closeDate = parseCallDate(node.deadline);

  // Try deadlines array – pick the latest
  if (!closeDate) {
    const deadlines = parseDeadlinesField(node.deadlines);
    if (deadlines.length > 0) {
      const parsed = deadlines.map(parseCallDate).filter(Boolean);
      if (parsed.length > 0) {
        closeDate = parsed.reduce((a, b) => (a > b ? a : b));
      }
    }
  }

  if (!closeDate) {
    closeDate = parseCallDate(node.closing_date ?? node.closingDate ?? node.end_date ?? node.endDate);
  }

  if (!openDate && !closeDate) return null;
  return { openDate, closeDate };
}

/** Return a "YYYY-MM" key for a date. */
export function monthKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Return the first day of a month for a "YYYY-MM" key. */
export function monthKeyToDate(key) {
  return new Date(`${key}-01T00:00:00`);
}

/**
 * Short label: "JAN", "FEB", … — with the full year appended when the strip spans more
 * than one. The year is spelled out rather than abbreviated: "JAN '24" was read as a day
 * number ("January 24th") on a multi-year axis.
 */
export function formatMonthShort(date, withYear = false) {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const m = months[date.getMonth()];
  return withYear ? `${m} ${date.getFullYear()}` : m;
}

/** Label parts for the range display: { start: "Sept 2026", end: "Dec 2026" } */
export function formatRangeParts(startDate, endDate) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sept","Oct","Nov","Dec"];
  if (!startDate || !endDate) return null;
  return {
    start: `${months[startDate.getMonth()]} ${startDate.getFullYear()}`,
    end: `${months[endDate.getMonth()]} ${endDate.getFullYear()}`,
  };
}

/**
 * Which months get an axis label, and what it says.
 *
 * A five-year strip is sixty bars: a label per bar would overprint, so ticks thin out.
 * They step along a calendar ladder (every 1/2/3/4/6/12 months) anchored on **January**
 * rather than on the first bucket, so the spacing is regular and the same months recur in
 * every year — an axis reading 2023·MAY·SEP·2024·MAY·SEP is a scale, where an arbitrary
 * every-nth-bar sequence just looks like months went missing.
 *
 * January carries the year, and on a multi-year strip it shows the year *instead of* the
 * month: "JAN '24" reads as a date ("January 24th"), which is the wrong thing for an axis
 * of months to say. On a single-year strip the header already names the year, so January
 * stays "JAN".
 *
 * @param {Array}  buckets  from bucketCallsByMonth
 * @param {number} width    px available to the whole strip
 * @returns {Array} [{ index, key, isYear, text }]
 */
export function axisTicks(buckets, width) {
  const list = buckets || [];
  if (list.length === 0 || !(width > 0)) return [];

  const step = width / list.length;
  const MONTH_LABEL_PX = 30;
  const ladder = [1, 2, 3, 4, 6, 12];
  const interval = ladder.find((n) => n * step >= MONTH_LABEL_PX) || 12;

  const ticks = [];
  list.forEach((b, index) => {
    const month = b.date.getMonth();
    if (month % interval !== 0) return;
    const isYear = month === 0 && b.spansYears;
    ticks.push({ index, key: b.key, isYear, text: isYear ? String(b.year) : b.label });
  });
  return ticks;
}

/** Months since year 0 — a comparable ordinal, so month arithmetic can't wrap wrong. */
function monthIndex(date) {
  return date.getFullYear() * 12 + date.getMonth();
}

function monthIndexToDate(mi) {
  return new Date(Math.floor(mi / 12), mi % 12, 1);
}

/**
 * Hard ceiling on the number of bars — ten years. High enough that no real portfolio hits
 * it, low enough that a single corrupt date can't produce a century of 1px bars. When it
 * does engage the header count follows the window (see useTimelineData), so the strip and
 * its count still describe the same set.
 */
const MAX_BUCKETS = 120;

/**
 * Work-programme editions run two calendar years — 2026 and 2027 are one period — and the
 * period is what people plan against. Anchored on even years so it stays put for both of
 * its years: during 2027 the current period is still 2026–27, not 2027–28.
 *
 * If the editions ever stop falling on even years, this is the one line to change.
 */
const PERIOD_YEARS = 2;

/** [first, last] month index of the work-programme period containing `today`. */
export function currentPeriodMonths(today) {
  const y = today.getFullYear();
  const start = y - (((y % PERIOD_YEARS) + PERIOD_YEARS) % PERIOD_YEARS);
  return [start * 12, (start + PERIOD_YEARS - 1) * 12 + 11];
}

/**
 * Bucket calls into one bucket per month.
 *
 * The window is the **current work-programme period** (2026–27, and so on), which is the
 * span people actually plan against. Left to the data, the top level runs Feb 2022 → Dec
 * 2027: five years of near-empty strip either side of the two that matter, and bars too
 * thin to read. Two rules keep that honest:
 *
 *  - the header count is computed from the same window (see `useTimelineData`), so the
 *    strip and its count always describe the same set — the earlier bug was a chart that
 *    drew one year while the count spoke for five;
 *  - a view with nothing in the current period (an archive, a programme that has moved
 *    on) falls back to the span of its own calls rather than showing an empty strip.
 *
 * Pass `{ window: "data" }` for the full span of whatever is in view.
 *
 * Each bucket carries the status split of the calls overlapping that month, evaluated
 * against today:
 *  - "open"     – accepting submissions right now (opening_date <= today <= deadline)
 *  - "upcoming" – opening date still ahead
 *  - "closed"   – deadline already passed
 *  - "empty"    – no calls overlap this month
 *
 * @param {Array}  callsWithDates  calls carrying { openDate, closeDate, programme }
 * @param {Object} [options]
 * @param {Date}   [options.today]  override for "now" (tests)
 * @param {string} [options.window] "period" (default) or "data"
 */
export function bucketCallsByMonth(callsWithDates, options = {}) {
  const today = options.today instanceof Date ? new Date(options.today) : new Date();
  today.setHours(0, 0, 0, 0);

  // Normalise to a { from, to } span plus a status fixed at today. Status belongs to the
  // call, not to the month it happens to fall in, so it is resolved once here rather than
  // re-derived (inconsistently) inside the month loop.
  const calls = [];
  for (const c of callsWithDates || []) {
    const a = c.openDate || c.closeDate;
    const b = c.closeDate || c.openDate;
    if (!a || !b) continue;
    const from = a <= b ? a : b;
    const to = a <= b ? b : a;
    const status = to < today ? "closed" : from > today ? "upcoming" : "open";
    calls.push({ from, to, status, programme: c.programme });
  }

  let firstMi = null;
  let lastMi = null;

  if (options.window !== "data") {
    const [periodFirst, periodLast] = currentPeriodMonths(today);
    // An empty view still gets the period, so the strip reads as "nothing this period"
    // rather than collapsing to nothing.
    const anyInPeriod =
      calls.length === 0 ||
      calls.some((c) => monthIndex(c.from) <= periodLast && monthIndex(c.to) >= periodFirst);
    if (anyInPeriod) {
      firstMi = periodFirst;
      lastMi = periodLast;
    }
  }

  if (firstMi === null) {
    // Either the caller asked for the full span, or nothing in view falls in the current
    // period — take the months the calls actually touch.
    for (const c of calls) {
      const a = monthIndex(c.from);
      const b = monthIndex(c.to);
      firstMi = firstMi === null ? a : Math.min(firstMi, a);
      lastMi = lastMi === null ? b : Math.max(lastMi, b);
    }

    if (firstMi === null) {
      const [periodFirst, periodLast] = currentPeriodMonths(today);
      firstMi = periodFirst;
      lastMi = periodLast;
    } else if (lastMi - firstMi + 1 > MAX_BUCKETS) {
      // Absurd span (a stray date decades out): keep the most recent months, so what is
      // still to come stays visible.
      firstMi = lastMi - MAX_BUCKETS + 1;
    }
  }

  const spansYears =
    monthIndexToDate(firstMi).getFullYear() !== monthIndexToDate(lastMi).getFullYear();

  const buckets = [];

  for (let mi = firstMi; mi <= lastMi; mi++) {
    const monthStart = monthIndexToDate(mi);
    // End of the last day, not its midnight — otherwise a call opening on the 31st
    // fails the overlap test for its own month.
    const monthEnd = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0,
      23, 59, 59, 999
    );

    let count = 0;
    let openCount = 0;
    let closedCount = 0;
    let upcomingCount = 0;
    const byProgramme = {};

    for (const c of calls) {
      if (c.from > monthEnd || c.to < monthStart) continue;

      count++;
      if (c.programme) {
        byProgramme[c.programme] = (byProgramme[c.programme] || 0) + 1;
      }

      if (c.status === "open") openCount++;
      else if (c.status === "upcoming") upcomingCount++;
      else closedCount++;
    }

    let status = "empty";
    if (count > 0) {
      if (openCount > 0) status = "open";
      else if (upcomingCount > 0) status = "upcoming";
      else status = "closed";
    }

    const isYearStart = monthStart.getMonth() === 0 || mi === firstMi;

    buckets.push({
      key: monthKey(monthStart),
      date: monthStart,
      label: formatMonthShort(monthStart),
      // Year-qualified label for the axis and the hover card, so two "MAY"s in a
      // two-year strip can't be confused for each other.
      fullLabel: formatMonthShort(monthStart, spansYears),
      year: monthStart.getFullYear(),
      isYearStart,
      spansYears,
      count,
      openCount,
      closedCount,
      upcomingCount,
      status,
      byProgramme,
    });
  }

  return buckets;
}
