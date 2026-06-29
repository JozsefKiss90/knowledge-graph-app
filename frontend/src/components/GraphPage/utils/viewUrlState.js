// src/components/GraphPage/utils/viewUrlState.js
//
// Tier 3.1 — shareable deep-link URLs.
//
// Serialise the view-defining GraphPage state into URL query params and back, so
// a view can be bookmarked, reopened, or shared. Keys are short and human-legible:
//
//   g       programme / cluster key   (graphName, omitted for the ROOT overview)
//   dest    current destination id    (the DEST_<id> layer, stored without the prefix)
//   call    a specific call id        (read-only convenience for locate-style links)
//   view    "dashboard"               (omitted for the default graph view)
//   panel   CORDIS tool tab           (fields | country | hopOn)
//   country country overlay code      (countryOverlayCode)
//   from/to timeline window           (ISO YYYY-MM-DD, inclusive)
//   layout  "breadthfirst"            (omitted for the default force layout)
//
// The full Neo4j call/destination ids live only in Cytoscape (DEST_<id> in
// scratch("layerKey")); graphName never holds a DEST key. So a deep link reaches a
// destination by re-using the existing pendingNav drill (clusterKey -> destination),
// exactly like the legend tree and the chat-assistant "locate" pipeline.

import { GRAPH_ENDPOINTS } from "../useGraphData";

const DEST_PREFIX = "DEST_";

export const VALID_GRAPH_NAMES = new Set(["ROOT", ...Object.keys(GRAPH_ENDPOINTS)]);
const VALID_VIEWS = new Set(["graph", "dashboard"]);
const VALID_PANELS = new Set(["fields", "country", "hopOn"]);
const VALID_LAYOUTS = new Set(["cose-bilkent", "breadthfirst"]);

/** Format a Date as a local YYYY-MM-DD string, or null if invalid. */
function isoDay(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string into a local Date, or null. */
function parseDay(s) {
  if (!s) return null;
  const d = new Date(`${String(s)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Read the current destination id from a Cytoscape instance's layer scratch.
 * Returns the raw id (no DEST_ prefix) when on a destination layer, else null.
 */
export function readCurrentDestinationId(cy) {
  try {
    if (!cy || cy.destroyed?.()) return null;
    const raw = cy.scratch?.("layerKey");
    if (!raw) return null;
    const key = String(raw).replace(/_cose$/i, "");
    return key.startsWith(DEST_PREFIX) ? key.slice(DEST_PREFIX.length) : null;
  } catch {
    return null;
  }
}

/**
 * Build a plain { key: value } params object from the current view state.
 * Only meaningful keys are included, so a default (ROOT / graph / no filter) view
 * serialises to {} — i.e. a bare "/".
 *
 * @param {object} state
 * @param {string}  state.graphName
 * @param {string?} state.destinationId      raw destination id (no DEST_ prefix)
 * @param {string?} state.viewMode           "graph" | "dashboard"
 * @param {string?} state.dashboardPanel     "fields" | "country" | "hopOn"
 * @param {string?} state.countryOverlayCode
 * @param {{start:Date,end:Date}?} state.timelineSelection
 * @param {string?} state.layoutName
 */
export function serializeView(state) {
  const {
    graphName,
    destinationId,
    viewMode,
    dashboardPanel,
    countryOverlayCode,
    timelineSelection,
    layoutName,
  } = state || {};

  const params = {};

  const hasProgramme =
    graphName && graphName !== "ROOT" && VALID_GRAPH_NAMES.has(graphName);
  if (hasProgramme) params.g = graphName;

  // A destination only makes sense relative to its programme.
  if (hasProgramme && destinationId) params.dest = String(destinationId);

  if (viewMode === "dashboard") params.view = "dashboard";
  if (dashboardPanel && VALID_PANELS.has(dashboardPanel)) params.panel = dashboardPanel;
  if (countryOverlayCode) params.country = String(countryOverlayCode);

  if (timelineSelection?.start && timelineSelection?.end) {
    const from = isoDay(timelineSelection.start);
    const to = isoDay(timelineSelection.end);
    if (from && to) {
      params.from = from;
      params.to = to;
    }
  }

  if (layoutName === "breadthfirst") params.layout = "breadthfirst";

  return params;
}

/**
 * Read a view object out of URLSearchParams (or anything with a .get()).
 * Output keys mirror GraphPage state names, so the caller can apply them with the
 * existing setters. Returns {} when nothing recognised is present.
 */
export function deserializeView(searchParams) {
  if (!searchParams || typeof searchParams.get !== "function") return {};
  const get = (k) => {
    try {
      return searchParams.get(k);
    } catch {
      return null;
    }
  };

  const out = {};

  const g = get("g");
  if (g && VALID_GRAPH_NAMES.has(g)) out.graphName = g;

  const dest = get("dest");
  if (dest && out.graphName) out.destinationId = String(dest);

  const call = get("call");
  if (call) out.callId = String(call);

  const view = get("view");
  if (view && VALID_VIEWS.has(view)) out.viewMode = view;

  const panel = get("panel");
  if (panel && VALID_PANELS.has(panel)) out.dashboardPanel = panel;

  const country = get("country");
  if (country) out.countryOverlayCode = String(country);

  const from = parseDay(get("from"));
  const to = parseDay(get("to"));
  if (from && to && from <= to) out.timelineSelection = { start: from, end: to };

  const layout = get("layout");
  if (layout && VALID_LAYOUTS.has(layout)) out.layoutName = layout;

  return out;
}

/** Build an absolute shareable URL string for the given params object. */
export function buildShareUrl(params) {
  const qs = new URLSearchParams(params).toString();
  const base = `${window.location.origin}${window.location.pathname}`;
  return qs ? `${base}?${qs}` : base;
}

/** Parse a saved/shared URL string back into a view object. */
export function viewFromUrl(url) {
  try {
    const u = new URL(url, window.location.origin);
    return deserializeView(u.searchParams);
  } catch {
    return {};
  }
}
