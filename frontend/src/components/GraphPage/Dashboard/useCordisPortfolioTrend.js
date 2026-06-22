import { useEffect, useRef, useState } from "react";

// F3: fetch the whole-portfolio CORDIS funded-activity trend (GET /cordis/portfolio-trend) — the aggregate
// counterpart to A6's per-call trend. Mirrors useFundingByProgramme/useCordisPortfolio: a singleton Map
// cache + request-race guard, and only fetches when `enabled` (the parent gates it on F1 having CORDIS
// data, so a CORDIS-less install never makes the request).
const API_BASE = process.env.REACT_APP_API_URL || "";
const CACHE_KEY = "portfolio-trend";
const _cache = new Map();

export default function useCordisPortfolioTrend(enabled = true) {
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

    fetch(`${API_BASE}/cordis/portfolio-trend`)
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
