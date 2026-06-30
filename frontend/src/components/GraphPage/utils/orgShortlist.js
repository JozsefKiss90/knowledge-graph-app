// src/components/GraphPage/utils/orgShortlist.js
//
// Tier 3.4 — a localStorage shortlist of CORDIS organisations (partner-shortlist
// builder). Mirrors the savedViews / bookmarkedCalls precedents; dispatches an
// "orgShortlistChanged" event so any open view can react.

const STORAGE_KEY = "cordisOrgShortlist";
const MAX_ITEMS = 200;
const CHANGE_EVENT = "orgShortlistChanged";

export function readOrgShortlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((o) => o && typeof o.id === "string" && typeof o.name === "string");
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // storage full / unavailable — non-fatal
  }
  return list;
}

export function isShortlisted(id) {
  return readOrgShortlist().some((o) => o.id === String(id));
}

/** Add an org { id, name, country, orgTypeLabel, projectCount, totalEcContribution } (newest first). */
export function addToShortlist(org) {
  if (!org || !org.id) return readOrgShortlist();
  const list = readOrgShortlist();
  if (list.some((o) => o.id === String(org.id))) return list;
  const entry = {
    id: String(org.id),
    name: org.name || String(org.id),
    country: org.country || "",
    orgTypeLabel: org.orgTypeLabel || "",
    projectCount: org.projectCount || 0,
    totalEcContribution: org.totalEcContribution || 0,
    addedAt: new Date().toISOString(),
  };
  return write([entry, ...list]);
}

export function removeFromShortlist(id) {
  return write(readOrgShortlist().filter((o) => o.id !== String(id)));
}

export function clearShortlist() {
  return write([]);
}

export const ORG_SHORTLIST_EVENT = CHANGE_EVENT;
export const ORG_SHORTLIST_KEY = STORAGE_KEY;
