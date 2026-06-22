import { useEffect, useRef, useState } from "react";

// F2: fetch the per-programme CORDIS awarded totals (GET /cordis/funding-by-programme) — the awarded
// counterpart to the work-programme's planned indicative budget. Mirrors useCordisPortfolio: a singleton
// Map cache + request-race guard. Only fetches when `enabled` (the parent gates it on F1 having CORDIS
// data, so a CORDIS-less install never makes the request).
const API_BASE = process.env.REACT_APP_API_URL || "";
const CACHE_KEY = "funding-by-programme";
const _cache = new Map();

// Map a raw backend Call.source code to the dashboard's programme key (the PROGRAMME_DISPLAY key the
// planned-budget map is keyed by). "Backend returns raw codes, presentation is the frontend's" — clusters
// arrive as `cluster_1`, the dashboard knows them as `Cluster_1`; any other source is upper-cased as a
// best-effort match (falls back to a default label/colour client-side if it isn't a known key).
export function sourceToProgKey(source) {
  const m = /^cluster_(\d+)$/i.exec(source || "");
  if (m) return `Cluster_${m[1]}`;
  return (source || "").toUpperCase();
}

// Reduce the backend response into a { [progKey]: { awardedEc, projectCount, callCount, source } } map for
// merging with the planned-budget map. If two raw sources ever collapse to the same programme key, their
// measures are summed. Returns null when there is no usable awarded data (drives the "no awarded" gating).
export function mapAwardedToProgrammeKeys(data) {
  const programmes = data && Array.isArray(data.programmes) ? data.programmes : null;
  if (!programmes || programmes.length === 0) return null;
  const out = {};
  for (const p of programmes) {
    const key = sourceToProgKey(p.source);
    if (!key) continue;
    const prev = out[key] || { awardedEc: 0, projectCount: 0, callCount: 0, source: p.source };
    out[key] = {
      awardedEc: prev.awardedEc + (p.awardedEc || 0),
      projectCount: prev.projectCount + (p.projectCount || 0),
      callCount: prev.callCount + (p.callCount || 0),
      source: prev.source,
    };
  }
  return Object.keys(out).length ? out : null;
}

export default function useFundingByProgramme(enabled = true) {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const reqRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;
    if (_cache.has(CACHE_KEY)) {
      setState({ loading: false, data: _cache.get(CACHE_KEY), error: null });
      return undefined;
    }
    const myReq = ++reqRef.current;
    let cancelled = false;
    setState({ loading: true, data: null, error: null });

    fetch(`${API_BASE}/cordis/funding-by-programme`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => {
        if (cancelled || myReq !== reqRef.current) return;
        _cache.set(CACHE_KEY, json);
        setState({ loading: false, data: json, error: null });
      })
      .catch((err) => {
        if (cancelled || myReq !== reqRef.current) return;
        setState({ loading: false, data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
