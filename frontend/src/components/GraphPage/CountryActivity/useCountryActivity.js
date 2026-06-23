import { useEffect, useRef, useState } from "react";

// B4: fetch a country's activity across the graph's CORDIS-funded areas (GET /cordis/country-activity).
// Returns the dropdown facets + the covered set even before a country is picked (country=""), then the
// per-area role split + the graph-overlay id sets once a country is chosen. Mirrors useCordisOrganisations:
// a module-level Map cache keyed by the country code, a request-race guard, and fetch-only-when-enabled so the
// overlay costs nothing until the country tool/paint needs it.
//
// Two instances run concurrently while the dashboard country tool is open (the panel body + the graph-paint
// fetch in GraphMainColumn), both reacting to the same selected-country state. A module-level in-flight map
// lets them share a single request for a not-yet-cached country, so selecting a country costs one GET.
const API_BASE = process.env.REACT_APP_API_URL || "";
const _cache = new Map();
const _inflight = new Map(); // country key -> in-flight fetch promise (shared across concurrent instances)

export default function useCountryActivity(country, open) {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const reqRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setState({ loading: false, data: null, error: null });
      return undefined;
    }
    const key = country || "";
    if (_cache.has(key)) {
      setState({ loading: false, data: _cache.get(key), error: null });
      return undefined;
    }
    const myReq = ++reqRef.current;
    let cancelled = false;
    setState({ loading: true, data: null, error: null });

    // Reuse an in-flight request for the same country if one is already running (the panel body and the
    // graph-paint fetch mount together), otherwise start one and publish it so the sibling can join.
    let promise = _inflight.get(key);
    if (!promise) {
      const params = new URLSearchParams();
      if (country) params.set("country", country);
      const qs = params.toString();
      promise = fetch(`${API_BASE}/cordis/country-activity${qs ? `?${qs}` : ""}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((json) => {
          _cache.set(key, json);
          return json;
        })
        .finally(() => {
          _inflight.delete(key);
        });
      _inflight.set(key, promise);
    }

    promise
      .then((json) => {
        if (cancelled || myReq !== reqRef.current) return;
        setState({ loading: false, data: json, error: null });
      })
      .catch((err) => {
        if (cancelled || myReq !== reqRef.current) return;
        setState({ loading: false, data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [country, open]);

  return state;
}
