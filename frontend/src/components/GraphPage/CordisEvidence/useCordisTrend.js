import { useEffect, useRef, useState } from "react";

// A6: fetch the CORDIS funding-history trend for a call's subject area from the backend
// (GET /cordis/call-trend). Results are cached per call id so hover->detail->back doesn't refetch.
// Mirrors useCordisEvidence (A2) — same request-race guard + per-id Map cache.
const API_BASE = process.env.REACT_APP_API_URL || "";
const _cache = new Map();

export default function useCordisTrend(callId) {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const reqRef = useRef(0);

  useEffect(() => {
    if (!callId) {
      setState({ loading: false, data: null, error: null });
      return undefined;
    }
    if (_cache.has(callId)) {
      setState({ loading: false, data: _cache.get(callId), error: null });
      return undefined;
    }
    const myReq = ++reqRef.current;
    let cancelled = false;
    setState({ loading: true, data: null, error: null });

    fetch(`${API_BASE}/cordis/call-trend?call_id=${encodeURIComponent(callId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => {
        if (cancelled || myReq !== reqRef.current) return;
        _cache.set(callId, json);
        setState({ loading: false, data: json, error: null });
      })
      .catch((err) => {
        if (cancelled || myReq !== reqRef.current) return;
        setState({ loading: false, data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [callId]);

  return state;
}
