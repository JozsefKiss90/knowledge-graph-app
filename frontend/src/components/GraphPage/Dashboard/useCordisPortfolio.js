import { useEffect, useRef, useState } from "react";

// F1: fetch the portfolio-wide CORDIS funded-reality totals from the backend
// (GET /cordis/portfolio-summary). One singleton fetch for the whole dashboard, cached so the
// dashboard mounting/unmounting doesn't refetch. Its data also gates the CORDIS dashboard section:
// render it only when projectCount > 0 (an empty graph yields an all-zero summary).
const API_BASE = process.env.REACT_APP_API_URL || "";
const CACHE_KEY = "portfolio-summary";
const _cache = new Map();

export default function useCordisPortfolio() {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const reqRef = useRef(0);

  useEffect(() => {
    if (_cache.has(CACHE_KEY)) {
      setState({ loading: false, data: _cache.get(CACHE_KEY), error: null });
      return undefined;
    }
    const myReq = ++reqRef.current;
    let cancelled = false;
    setState({ loading: true, data: null, error: null });

    fetch(`${API_BASE}/cordis/portfolio-summary`)
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
  }, []);

  return state;
}
