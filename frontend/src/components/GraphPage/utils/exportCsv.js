// src/components/GraphPage/utils/exportCsv.js
//
// Tier 3.4 — minimal client-side CSV export (no dependency). Quotes every field
// per RFC 4180 and triggers a download via a temporary object URL.

function csvCell(value) {
  let s = value == null ? "" : String(value);
  // Neutralize spreadsheet formula injection (CWE-1236): Excel / Sheets / LibreOffice
  // still evaluate a *quoted* cell as a formula when it begins with one of these, because
  // the CSV parser consumes the surrounding quotes. RFC 4180 quoting alone does NOT prevent
  // this — so prefix a literal apostrophe first when a field starts with a trigger char.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  // Then quote + escape embedded quotes for structural (comma / quote / newline) safety.
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Build a CSV string from rows of objects.
 * @param {Array<object>} rows
 * @param {Array<{key:string,label:string}>} columns
 */
export function buildCsv(rows, columns) {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const body = (rows || [])
    .map((row) => columns.map((c) => csvCell(row[c.key])).join(","))
    .join("\r\n");
  return body ? `${header}\r\n${body}` : header;
}

/** Trigger a browser download of `csv` as `filename`. */
export function downloadCsv(filename, csv) {
  try {
    // Prepend a UTF-8 BOM so Excel reads accented org names correctly.
    const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch {
    // download unavailable — non-fatal
  }
}
