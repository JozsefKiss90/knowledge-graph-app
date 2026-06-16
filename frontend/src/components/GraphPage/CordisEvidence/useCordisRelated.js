import { useEffect, useRef, useState } from "react";

// B3: fetch related calls (shared EuroSciVoc research fields of funded projects) for a call from the
// backend (GET /cordis/related-calls). Results are cached per call id so hover->detail->back doesn't
// refetch. Mirrors useCordisTrend / useCordisEvidence — same request-race guard + per-id Map cache.
const API_BASE = process.env.REACT_APP_API_URL || "";
const _cache = new Map();

export default function useCordisRelated(callId) {
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

    fetch(`${API_BASE}/cordis/related-calls?call_id=${encodeURIComponent(callId)}`)
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
