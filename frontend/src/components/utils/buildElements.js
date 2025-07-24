export function buildElements(graphData) {    
    const nodeElements = [];
    const nodeIdSet = new Set();
  
    graphData.nodes.nodes.forEach((wrappedNode) => {
      const node = wrappedNode.n || wrappedNode;
      if (node.id && node.name) {
        nodeElements.push({
          data: {
            id: node.id,
            label: node.name,
            shortLabel: node.name.length > 22 ? node.name.slice(0, 20) + '...' : node.name,
            displayLabel: node.name,
            ...node,
          }
        });
        nodeIdSet.add(node.id);
      }
    });
  
    const edgeElements = [];
  
    if (graphData.rels?.relationships) {
      graphData.rels.relationships.forEach((rel) => {
        const { id, source, target, type, label } = rel;
  
        if (nodeIdSet.has(source) && nodeIdSet.has(target)) {
          edgeElements.push({
            data: {
              id,
              source,
              target,
              label: label || type,
              type,
              score: rel.score ?? null,
              topic_id: rel.topic_id ?? null,
              keywords: rel.keywords ?? null,
            }
          });
        } else {
          console.warn(`⚠️ Skipping edge ${id}: missing source or target node.`);
        }
      });
    }
  
    return { nodeElements, edgeElements };
  }

export default buildElements;