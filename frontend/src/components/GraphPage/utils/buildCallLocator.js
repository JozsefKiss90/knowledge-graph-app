// src/components/GraphPage/utils/buildCallLocator.js
//
// Maps a Horizon Europe call `identifier` -> where that call lives in the nested
// graph, so a feature (e.g. the chat assistant, A3) can navigate to it.
//
// A Call node's Cytoscape id IS its `identifier` (backend resolves the node id
// from `identifier`, base_cluster_builder.py). We index every preloaded
// programme store with the SAME pipeline the rendered graph and the legend tree
// use — buildElements + collapseSingleCallDestinations — so the locator's notion
// of "where a call lives" matches what the user actually sees:
//   - a call promoted to its programme overview (single-call destination that
//     collapsed) -> { destinationId: null, promoted: true }
//   - a call inside a kept (multi-call) destination -> { destinationId, promoted: false }
//
// No hardcoded identifier-prefix parsing: the cluster key is the real store key
// the call was found under, so clusters AND non-cluster programmes (ERC, MSCA,
// EIC, standalone programmes, ...) resolve identically. A call whose dataset is
// not loaded simply returns null (honest "not on graph").

import { buildElements, collapseSingleCallDestinations } from "../../utils/buildElements";

const isCallNode = (d) =>
  String(d?.type || d?.category || "").toLowerCase() === "call";
const isHasCall = (d) => d?.type === "HAS_CALL" || d?.category === "HAS_CALL";

/**
 * Build a one-shot locator over the preloaded graph store.
 * @param {(key:string)=>any} loadFromStore - GraphPage's preloaded-store reader.
 * @returns {{ locate:(identifier:string)=>({clusterKey:string,destinationId:string|null,promoted:boolean,callId:string}|null), size:number }}
 */
export function buildCallLocator(loadFromStore) {
  const index = new Map(); // callId -> location

  let keys = [];
  try {
    keys = loadFromStore?.("__keys__") || [];
  } catch {
    keys = [];
  }

  for (const key of keys) {
    let raw = null;
    try {
      raw = loadFromStore?.(key);
    } catch {
      raw = null;
    }
    if (!raw) continue;

    let collapsed;
    try {
      collapsed = collapseSingleCallDestinations(buildElements(raw));
    } catch {
      continue;
    }

    const nodes = collapsed?.nodeElements || [];
    const edges = collapsed?.edgeElements || [];

    // call id -> destination id (from HAS_CALL edges that survived collapse).
    // First parent wins: in the rare case a call sits under two destinations,
    // either is a valid navigation target (the call is rendered in both DEST
    // layers), so picking the first deterministically is fine.
    const destByCall = new Map();
    for (const e of edges) {
      const d = e?.data || {};
      if (!isHasCall(d)) continue;
      const tgt = d.target != null ? String(d.target) : "";
      const src = d.source != null ? String(d.source) : "";
      if (tgt && src && !destByCall.has(tgt)) destByCall.set(tgt, src);
    }

    for (const n of nodes) {
      const d = n?.data || {};
      if (!isCallNode(d)) continue;
      const callId = d.id != null ? String(d.id) : "";
      if (!callId || index.has(callId)) continue; // first programme wins

      const promoted = d.promoted === true;
      index.set(callId, {
        clusterKey: key,
        destinationId: promoted ? null : destByCall.get(callId) || null,
        promoted,
        callId,
      });
    }
  }

  return {
    size: index.size,
    locate(identifier) {
      if (!identifier) return null;
      return index.get(String(identifier)) || null;
    },
  };
}
