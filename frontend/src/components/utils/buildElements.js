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
    const type =
      (n.type ?? n.Type ?? n.category ?? n.node_type ?? "").toString().trim();

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
