// src/components/GraphPage/utils/savedViews.js
//
// Tier 3.1 — named Saved Views.
//
// A saved view is just a name + a shareable deep-link URL (see viewUrlState.js),
// persisted in localStorage. Mirrors the existing "bookmarkedCalls" precedent.

const STORAGE_KEY = "savedViews";
const MAX_VIEWS = 50;

/** Read the saved-views list (newest first). Always returns an array. */
export function readSavedViews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v) =>
        v &&
        typeof v.id === "string" &&
        typeof v.url === "string" &&
        typeof v.name === "string"
    );
  } catch {
    return [];
  }
}

function writeSavedViews(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_VIEWS)));
  } catch {
    // storage full / unavailable — non-fatal
  }
  return list;
}

/**
 * Add a saved view. Returns the new list (newest first). A blank name falls back
 * to "Untitled view". Re-saving the exact same URL updates that entry's name
 * instead of creating a duplicate.
 */
export function addSavedView({ name, url }) {
  const list = readSavedViews();
  const cleanName = String(name || "").trim() || "Untitled view";
  const existingIdx = list.findIndex((v) => v.url === url);
  if (existingIdx !== -1) {
    list[existingIdx] = { ...list[existingIdx], name: cleanName };
    return writeSavedViews(list);
  }
  const entry = {
    id: `sv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    url,
    createdAt: new Date().toISOString(),
  };
  return writeSavedViews([entry, ...list]);
}

/** Remove a saved view by id. Returns the new list. */
export function removeSavedView(id) {
  return writeSavedViews(readSavedViews().filter((v) => v.id !== id));
}
