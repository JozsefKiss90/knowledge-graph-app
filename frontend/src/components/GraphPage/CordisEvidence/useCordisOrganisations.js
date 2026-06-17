import { useEffect, useRef, useState } from "react";

// B2: fetch the organisations active in a call's CORDIS-funded research area, with their coordinate/partner
// role split and facets (GET /cordis/area-organisations). Filtering is server-side, so the cache key
// includes the active country/type filters — each filter combination is fetched once and re-used.
const API_BASE = process.env.REACT_APP_API_URL || "";
const _cache = new Map();

export default function useCordisOrganisations(callId, { country, orgType } = {}) {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const reqRef = useRef(0);

  useEffect(() => {
    if (!callId) {
      setState({ loading: false, data: null, error: null });
      return undefined;
    }
    const key = `${callId}|${country || ""}|${orgType || ""}`;
    if (_cache.has(key)) {
      setState({ loading: false, data: _cache.get(key), error: null });
      return undefined;
    }
    const myReq = ++reqRef.current;
    let cancelled = false;
    setState({ loading: true, data: null, error: null });

    const params = new URLSearchParams({ call_id: callId });
    if (country) params.set("country", country);
    if (orgType) params.set("org_type", orgType);

    fetch(`${API_BASE}/cordis/area-organisations?${params.toString()}`)
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
  }, [callId, country, orgType]);

  return state;
}
