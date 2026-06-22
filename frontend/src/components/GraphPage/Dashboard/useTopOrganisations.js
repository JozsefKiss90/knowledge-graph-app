import { useEffect, useRef, useState } from "react";

// F6: fetch the portfolio-wide top funded organisations (GET /cordis/top-organisations) — the aggregate
// counterpart to B2's per-call partner finder. Mirrors the other dashboard CORDIS hooks: a singleton Map
// cache + request-race guard, and only fetches when `enabled` (the parent gates it on F1 having CORDIS
// data, so a CORDIS-less install never makes the request).
const API_BASE = process.env.REACT_APP_API_URL || "";
const _cache = new Map(); // top_n -> response json

export default function useTopOrganisations(enabled = true, topN = 15) {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const reqRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const key = String(topN);
    if (_cache.has(key)) {
      setState({ loading: false, data: _cache.get(key), error: null });
      return undefined;
    }
    const myReq = ++reqRef.current;
    let cancelled = false;
    setState({ loading: true, data: null, error: null });

    fetch(`${API_BASE}/cordis/top-organisations?top_n=${encodeURIComponent(topN)}`)
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
  }, [enabled, topN]);

  return state;
}
