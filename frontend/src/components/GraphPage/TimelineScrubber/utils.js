/**
 * Timeline scrubber date utilities.
 */

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
    let hasOpen = false;
    let hasUpcoming = false;

    for (const c of callsWithDates) {
      const cOpen = c.openDate || c.closeDate;
      const cClose = c.closeDate || c.openDate;

      // Does this call overlap this month?
      if (cOpen <= monthEnd && cClose >= monthStart) {
        count++;

        // Only consider open/upcoming for months that haven't fully passed
        if (!monthInPast) {
          if (cOpen <= today && cClose >= today) {
            hasOpen = true;
          } else if (cOpen > today) {
            hasUpcoming = true;
          }
        }
      }
    }

    let status = "empty";
    if (count > 0) {
      if (hasOpen) status = "open";
      else if (hasUpcoming) status = "upcoming";
      else status = "closed";
    }

    buckets.push({
      key: monthKey(monthStart),
      date: monthStart,
      label: formatMonthShort(monthStart),
      count,
      status,
    });
  }

  return buckets;
}
