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

/** Short label: "JAN", "FEB", … (year omitted since chart is single-year) */
export function formatMonthShort(date) {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return months[date.getMonth()];
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
 * Bucket calls into 12 monthly buckets for the current year (Jan–Dec).
 *
 * Each bucket gets a `status` colour hint:
 *  - "open"     – the month is now or in the future AND has calls that are
 *                 currently accepting submissions (opening_date <= today <= deadline)
 *  - "upcoming" – the month is in the future AND only has calls whose
 *                 opening_date has not yet arrived
 *  - "closed"   – the month is entirely in the past, or all overlapping calls
 *                 have already closed
 *  - "empty"    – no calls overlap this month
 */
export function bucketCallsByMonth(callsWithDates) {
  const YEAR = new Date().getFullYear();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = [];

  for (let m = 0; m < 12; m++) {
    const monthStart = new Date(YEAR, m, 1);
    const monthEnd = new Date(YEAR, m + 1, 0); // last day of month
    const monthInPast = monthEnd < today;

    let count = 0;
    let openCount = 0;
    let closedCount = 0;
    let upcomingCount = 0;
    const byProgramme = {};

    for (const c of callsWithDates) {
      const cOpen = c.openDate || c.closeDate;
      const cClose = c.closeDate || c.openDate;

      // Does this call overlap this month?
      if (cOpen <= monthEnd && cClose >= monthStart) {
        count++;
        if (c.programme) {
          byProgramme[c.programme] = (byProgramme[c.programme] || 0) + 1;
        }

        // Is this call currently accepting submissions?
        if (cOpen <= today && cClose >= today) {
          openCount++;
        } else if (!monthInPast && cOpen > today) {
          upcomingCount++;
        } else {
          closedCount++;
        }
      }
    }

    let status = "empty";
    if (count > 0) {
      if (openCount > 0) status = "open";
      else if (upcomingCount > 0) status = "upcoming";
      else status = "closed";
    }

    buckets.push({
      key: monthKey(monthStart),
      date: monthStart,
      label: formatMonthShort(monthStart),
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
