import { useEffect, useRef, useState } from "react";

// B6: fetch the hop-on host shortlist (GET /cordis/hop-on-hosts) — ongoing Horizon Europe Pillar II / EIC
// Pathfinder collaborative projects a widening-country partner could join, with each host's widening gap.
// Mirrors useCountryActivity: a module-level Map cache keyed by the active filter set, a request-race guard,
// and fetch-only-when-open so the finder costs nothing until the drawer is opened.
const API_BASE = process.env.REACT_APP_API_URL || "";
const _cache = new Map();

export default function useHopOnHosts(filters, open) {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const reqRef = useRef(0);

  const { programme, field, missingCountry, maxAgeMonths } = filters || {};

  useEffect(() => {
    if (!open) {
      setState({ loading: false, data: null, error: null });
      return undefined;
    }
    const params = new URLSearchParams();
    if (programme) params.set("programme", programme);
    if (field) params.set("field", field);
    if (missingCountry) params.set("missing_country", missingCountry);
    if (maxAgeMonths != null && maxAgeMonths !== "") params.set("max_age_months", String(maxAgeMonths));
    const qs = params.toString();
    const key = qs;

    if (_cache.has(key)) {
      setState({ loading: false, data: _cache.get(key), error: null });
      return undefined;
    }
    const myReq = ++reqRef.current;
    let cancelled = false;
    // Keep the previous result visible while refetching so the filter row doesn't collapse to a
    // "Loading" screen on every filter change — the loading-only view shows on the first load only.
    setState((prev) => ({ loading: true, data: prev.data, error: null }));

    fetch(`${API_BASE}/cordis/hop-on-hosts${qs ? `?${qs}` : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => {
        if (cancelled || myReq !== reqRef.current) return;
        _cache.set(key, json);
        setState({ loading: false, data: json, error: null });
      })
      .catch((err) => {
        if (cancelled || myReq !== reqRef.current) return;
        setState({ loading: false, data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [programme, field, missingCountry, maxAgeMonths, open]);

  return state;
}
