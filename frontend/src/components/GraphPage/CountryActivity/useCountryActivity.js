import { useEffect, useRef, useState } from "react";

// B4: fetch a country's activity across the graph's CORDIS-funded areas (GET /cordis/country-activity).
// Returns the dropdown facets + the covered set even before a country is picked (country=""), then the
// per-area role split + the graph-overlay id sets once a country is chosen. Mirrors useCordisOrganisations:
// a module-level Map cache keyed by the country code, a request-race guard, and fetch-only-when-open so the
// overlay costs nothing until the user opens the drawer.
const API_BASE = process.env.REACT_APP_API_URL || "";
const _cache = new Map();

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

    const params = new URLSearchParams();
    if (country) params.set("country", country);
    const qs = params.toString();

    fetch(`${API_BASE}/cordis/country-activity${qs ? `?${qs}` : ""}`)
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
  }, [country, open]);

  return state;
}
