// buildElements.js

export function buildElements(graphData) {
  const nodeElements = [];
  const edgeElements = [];
  const nodeIdSet = new Set();

  // --- tolerate old & new node response shapes
  const nodeArray =
    (graphData?.nodes?.nodes) ||            // old shape
    (graphData?.nodes?.data)  ||            // new shape (CL2 & CL3)
    (Array.isArray(graphData?.nodes) ? graphData.nodes : []); // safety

  // Build node elements
  nodeArray.forEach((wrapped) => {
    const node = wrapped?.n || wrapped; // old CL2 used { n: {...} }
    if (!node || !node.id || !node.name) return;

    nodeElements.push({
      data: {
        id: node.id,
        label: node.name,
        shortLabel:
          node.name.length > 22 ? node.name.slice(0, 20) + "..." : node.name,
        displayLabel: node.name,
        ...node, // keep other properties for side panels/tooltips
      },
    });

    nodeIdSet.add(node.id);
  });

  // --- relationships: expect { relationships: [...] }
  const relArray =
    (graphData?.rels?.relationships) ||
    (Array.isArray(graphData?.rels) ? graphData.rels : []) ||
    [];

  relArray.forEach((rel, idx) => {
    const source = rel.source || rel.from || rel.start || rel.a?.id;
    const target = rel.target || rel.to || rel.end || rel.b?.id;
    if (!source || !target) return;

    // keep only edges whose endpoints we actually have
    if (!nodeIdSet.has(source) || !nodeIdSet.has(target)) return;

    const id = rel.id || `${source}->${target}-${idx}`;
    const label = rel.label || rel.type || rel.relation || "RELATED";

    edgeElements.push({
      data: {
        id,
        source,
        target,
        label,
        type: rel.type || rel.relation || "RELATED",
        ...rel, // preserve extra fields if present
      },
    });
  });

  return { nodeElements, edgeElements };
}
