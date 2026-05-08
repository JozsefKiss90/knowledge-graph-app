// src/components/utils/buildElements.js
// Robust normaliser for mixed graph payloads -> Cytoscape elements.
// - Handles arrays or object-maps
// - Handles shapes like {nodes:{nodes:[{n:{...}}]}} or {nodes:{data:[...]}} or plain {nodes:[...]}
// - Shortens labels; preserves fullLabel
// - Filters edges whose endpoints are missing to avoid Cytoscape errors

const shorten = (txt, max = 32) => {
  if (!txt) return "";
  const s = String(txt);
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
};

// Turn arrays, object-maps, or falsy values into a clean array
const toArray = (x) => {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (typeof x === "object") return Object.values(x);
  return [];
};

// Extract a plain array of raw node objects (no wrappers)
const extractRawNodes = (raw) => {
  // already-normalised elements?
  if (raw?.nodeElements) return toArray(raw.nodeElements).map((e) => e?.data || {});
  // common shapes
  const candidates = [
    raw?.nodes?.nodes,   // old shape: {nodes:{nodes:[...]} }
    raw?.nodes?.data,    // new shape: {nodes:{data:[...]} }
    raw?.nodes,          // plain array/object-map
    raw?.Nodes,          // capitalised
  ];
  const arr = toArray(candidates.find((v) => v != null));
  // unwrap { n: {...} } if present
  return arr.map((w) => (w && w.n ? w.n : w));
};

// Extract a plain array of raw relationship objects
const extractRawEdges = (raw) => {
  // already-normalised elements?
  if (raw?.edgeElements) return toArray(raw.edgeElements).map((e) => e?.data || {});
  const candidates = [
    raw?.rels?.relationships, // usual
    raw?.rels,                // sometimes an array
    raw?.edges,
    raw?.Edges,
    raw?.relationships,
  ];
  return toArray(candidates.find((v) => v != null));
};

/**
 * Remove destination nodes that don't have 2+ genuinely different calls.
 * "Different" is determined by call **label/name**, not by node ID — regional
 * variants with the same display name count as one call.
 *
 *  - 0 calls  → destination removed (orphan)
 *  - 1 unique call name → destination removed, one representative call promoted
 *  - 2+ unique call names → destination kept
 *
 * Promoted calls get `promoted: true` + `promotedFromDest` data flags and
 * stay visible on programme overviews.  Duplicate call nodes (same name under
 * a collapsed destination) and their edges are removed.
 */
export function collapseSingleCallDestinations({ nodeElements, edgeElements }) {
  const destIds = new Set();
  const nodeMap = new Map();
  nodeElements.forEach((n) => {
    nodeMap.set(n?.data?.id, n);
    const t = String(n?.data?.type || n?.data?.category || "").toLowerCase();
    if (t === "destination") destIds.add(n.data.id);
  });
  if (destIds.size === 0) return { nodeElements, edgeElements };

  // Map each destination → its call node IDs (from HAS_CALL edges)
  const callIdsByDest = new Map();
  edgeElements.forEach((e) => {
    const d = e?.data || {};
    const isHasCall = d.type === "HAS_CALL" || d.category === "HAS_CALL";
    if (isHasCall && destIds.has(d.source)) {
      if (!callIdsByDest.has(d.source)) callIdsByDest.set(d.source, new Set());
      callIdsByDest.get(d.source).add(d.target);
    }
  });

  // For each destination, group its calls by display label, then decide fate
  const toRemove = new Set();                // 0-call orphan destinations
  const toPromote = new Map();               // destId → representative callId
  const extraCallIds = new Set();            // duplicate call nodes to drop

  destIds.forEach((destId) => {
    const callIds = callIdsByDest.get(destId);
    if (!callIds || callIds.size === 0) {
      toRemove.add(destId);
      return;
    }

    // Group calls by label
    const labelGroups = new Map();           // label → [callId, …]
    callIds.forEach((cid) => {
      const node = nodeMap.get(cid);
      const label = node?.data?.label || node?.data?.name || node?.data?.fullLabel || cid;
      if (!labelGroups.has(label)) labelGroups.set(label, []);
      labelGroups.get(label).push(cid);
    });

    if (labelGroups.size <= 1) {
      // 0-1 unique label → collapse destination, keep first call as representative
      const ids = [...labelGroups.values()][0];
      toPromote.set(destId, ids[0]);
      ids.slice(1).forEach((id) => extraCallIds.add(id));
    }
    // 2+ unique labels → keep destination as-is
  });

  const allCollapsed = new Set([...toRemove, ...toPromote.keys()]);
  if (allCollapsed.size === 0 && extraCallIds.size === 0) {
    return { nodeElements, edgeElements };
  }

  // callId → destId for traceability on promoted calls
  const callToDest = new Map();
  toPromote.forEach((callId, destId) => callToDest.set(callId, destId));

  // Build new node list
  const newNodes = [];
  nodeElements.forEach((n) => {
    const id = n?.data?.id;
    if (allCollapsed.has(id)) return;            // remove collapsed destinations
    if (extraCallIds.has(id)) return;            // remove duplicate call nodes
    if (callToDest.has(id)) {
      newNodes.push({ ...n, data: { ...n.data, promoted: true, promotedFromDest: callToDest.get(id) } });
    } else {
      newNodes.push(n);
    }
  });

  // Build new edge list
  const newEdges = [];
  const rewiredSeen = new Set();

  edgeElements.forEach((e) => {
    const d = e?.data || {};
    const isHasCall = d.type === "HAS_CALL" || d.category === "HAS_CALL";
    const isHasDest = d.type === "HAS_DESTINATION" || d.category === "HAS_DESTINATION";

    // Drop any edge touching a removed duplicate call node
    if (extraCallIds.has(d.source) || extraCallIds.has(d.target)) return;

    // Drop HAS_CALL from any collapsed destination
    if (isHasCall && allCollapsed.has(d.source)) return;

    // Drop HAS_DESTINATION → orphan destination
    if (isHasDest && toRemove.has(d.target)) return;

    // Rewire HAS_DESTINATION → promoted destination to its representative call
    if (isHasDest && toPromote.has(d.target)) {
      const callId = toPromote.get(d.target);
      const dedup = `${d.source}->${callId}`;
      if (!rewiredSeen.has(dedup)) {
        rewiredSeen.add(dedup);
        newEdges.push({
          ...e,
          data: {
            ...d,
            id: `${d.source}->${callId}-promoted`,
            target: callId,
            type: "HAS_CALL",
          },
        });
      }
      return;
    }

    newEdges.push(e);
  });

  return { nodeElements: newNodes, edgeElements: newEdges };
}

export function buildElements(raw) {
  if (!raw) return { nodeElements: [], edgeElements: [] };

  // If it's already Cytoscape elements, still validate edges against nodes
  if (raw.nodeElements || raw.edgeElements) {
    const nodeEles = toArray(raw.nodeElements);
    const edgeEles = toArray(raw.edgeElements);

    const nodeIdSet = new Set(
      nodeEles.map((e) => String((e?.data?.id ?? "")).trim()).filter(Boolean)
    );

    const nodes = nodeEles.map((e) => {
      if (!e || e.group !== "nodes") return e;
      const d = e.data || {};
      const fullLabel = d.fullLabel ?? d.label ?? d.name ?? d.title ?? d.id;
      return {
        ...e,
        data: {
          ...d,
          id: String(d.id).trim(), fullLabel,
          label: fullLabel,
        },
      };
    });

    const edges = edgeEles
      .map((e, i) => {
        const d = e?.data || {};
        const source = String(
          d.source ?? d.start ?? d.from ?? d.src ?? d.a?.id ?? ""
        ).trim();
        const target = String(
          d.target ?? d.end ?? d.to ?? d.tgt ?? d.b?.id ?? ""
        ).trim();
        if (!nodeIdSet.has(source) || !nodeIdSet.has(target)) return null;
        return {
          ...e,
          data: { ...d, id: d.id ?? `${source}->${target}-${i}`, source, target },
        };
      })
      .filter(Boolean);

    return { nodeElements: nodes, edgeElements: edges };
  }

  // Raw inputs
  const rawNodes = extractRawNodes(raw);
  const rawEdges = extractRawEdges(raw);

  const nodeElements = [];
  const nodeIdSet = new Set();

  rawNodes.forEach((n) => {
    if (!n) return;
    const id =
      n.id ?? n.uuid ?? n.key ?? n._id ?? n.ID ?? n.Id ?? Math.random().toString(36).slice(2);
    const cleanId = String(id).trim();
    if (!cleanId) return;

    const fullLabel =
      n.fullLabel ?? n.label ?? n.name ?? n.title ?? n.displayLabel ?? cleanId;
    let type =
      (n.type ?? n.Type ?? n.category ?? n.node_type ?? "").toString().trim();

    // normalise programme roots
    const label =
      n.fullLabel ?? n.label ?? n.name ?? n.title ?? n.displayLabel ?? "";

    const isProgrammeRoot =
      type === "cluster" &&
      (
        label === "Horizon Europe" ||
        label === "Digital Europe" ||
        label === "Erasmus+" ||
        label === "Connecting Europe Facility (CEF)" ||
        label === "Creative Europe (CREA)" ||
        label === "EURATOM"
      );

    if (isProgrammeRoot) {
      type = "root";
    }

    nodeElements.push({
      group: "nodes",
      data: {
        ...n,
        id: cleanId,
        type,
        category: n.category || type,
        fullLabel,
        label: fullLabel,
      },
    });
    nodeIdSet.add(cleanId);
  });

  const edgeElements = [];
  rawEdges.forEach((r, idx) => {
    if (!r) return;

    const source = String(
      r.source ?? r.from ?? r.start ?? r.src ?? r.a?.id ?? r.startNode ?? ""
    ).trim();
    const target = String(
      r.target ?? r.to ?? r.end ?? r.tgt ?? r.b?.id ?? r.endNode ?? ""
    ).trim();
    if (!source || !target) return;

    // **guard**: only include if both endpoints exist
    if (!nodeIdSet.has(source) || !nodeIdSet.has(target)) return;

    const id = String(r.id ?? `${source}->${target}-${idx}`).trim();
    const type = (r.type ?? r.label ?? r.Label ?? "RELATED").toString().trim();

    edgeElements.push({
      group: "edges",
      data: {
        ...r,
        id,
        source,
        target,
        type,
        label: type,
      },
    });
  });

  return { nodeElements, edgeElements };
}
