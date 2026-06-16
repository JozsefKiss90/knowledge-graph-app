import { useEffect, useRef, useState } from "react";

// B5: fetch the EuroSciVoc research-field hierarchy (with rolled-up funded-project + call counts) from the
// backend (GET /cordis/field-tree). The tree is global (not per-node), so it's fetched once and cached at
// module level. Mirrors useCordisRelated — same request-race guard. `reloadKey` lets a caller force a
// refetch (e.g. when first opening the drawer after an ingest); omit it for the default single fetch.
const API_BASE = process.env.REACT_APP_API_URL || "";
const _cache = new Map(); // reloadKey -> response json

export default function useCordisFieldTree(reloadKey = "default", enabled = true) {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const reqRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false, data: null, error: null });
      return undefined;
    }
    if (_cache.has(reloadKey)) {
      setState({ loading: false, data: _cache.get(reloadKey), error: null });
      return undefined;
    }
    const myReq = ++reqRef.current;
    let cancelled = false;
    setState({ loading: true, data: null, error: null });

    fetch(`${API_BASE}/cordis/field-tree`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => {
        if (cancelled || myReq !== reqRef.current) return;
        _cache.set(reloadKey, json);
        setState({ loading: false, data: json, error: null });
      })
      .catch((err) => {
        if (cancelled || myReq !== reqRef.current) return;
        setState({ loading: false, data: null, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, enabled]);

  return state;
}
