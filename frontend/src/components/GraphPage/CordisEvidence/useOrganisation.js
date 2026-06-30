import { useEffect, useRef, useState } from "react";

// Tier 3.4 — fetch one organisation's CORDIS dossier (GET /cordis/organisation?org_id=...).
// Mirrors useCordisRelated / useCordisEvidence: per-id Map cache (survives unmount) + request-race guard.
const API_BASE = process.env.REACT_APP_API_URL || "";
const _cache = new Map();

export default function useOrganisation(orgId) {
  const [state, setState] = useState({ loading: false, data: null, error: null, notFound: false });
  const reqRef = useRef(0);

  useEffect(() => {
    if (!orgId) {
      setState({ loading: false, data: null, error: null, notFound: false });
      return undefined;
    }
    if (_cache.has(orgId)) {
      setState({ loading: false, data: _cache.get(orgId), error: null, notFound: false });
      return undefined;
    }
    const myReq = ++reqRef.current;
    let cancelled = false;
    setState({ loading: true, data: null, error: null, notFound: false });

    fetch(`${API_BASE}/cordis/organisation?org_id=${encodeURIComponent(orgId)}`)
      .then((r) => {
        if (r.status === 404) return Promise.reject(new Error("not-found"));
        return r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`));
      })
      .then((json) => {
        if (cancelled || myReq !== reqRef.current) return;
        _cache.set(orgId, json);
        setState({ loading: false, data: json, error: null, notFound: false });
      })
      .catch((err) => {
        if (cancelled || myReq !== reqRef.current) return;
        const notFound = err.message === "not-found";
        setState({ loading: false, data: null, error: notFound ? null : err.message, notFound });
      });

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  return state;
}
