import { useEffect, useRef, useState } from "react";

// B5: fetch the Horizon Europe calls funded in a selected EuroSciVoc research field (rolled up over the
// field's subtree) from the backend (GET /cordis/field-calls?code=...). Cached per field code so
// re-selecting a field doesn't refetch. Mirrors useCordisRelated — same per-key Map cache + race guard.
const API_BASE = process.env.REACT_APP_API_URL || "";
const _cache = new Map(); // code -> response json

export default function useCordisFieldCalls(code) {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const reqRef = useRef(0);

  useEffect(() => {
    if (!code) {
      setState({ loading: false, data: null, error: null });
      return undefined;
    }
    if (_cache.has(code)) {
      setState({ loading: false, data: _cache.get(code), error: null });
      return undefined;
    }
    const myReq = ++reqRef.current;
    let cancelled = false;
    setState({ loading: true, data: null, error: null });

    fetch(`${API_BASE}/cordis/field-calls?code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => {
        if (cancelled || myReq !== reqRef.current) return;
        _cache.set(code, json);
        setState({ loading: false, data: json, error: null });
      })
      .catch((err) => {
        if (cancelled || myReq !== reqRef.current) return;
        setState({ loading: false, data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  return state;
}
