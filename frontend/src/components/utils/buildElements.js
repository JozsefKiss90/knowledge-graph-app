export function buildElements(graphData, rawGraphData) {
    const rawNodeMap = new Map();
    rawGraphData.nodes.nodes.forEach(wrapper => {
      const node = wrapper.n || wrapper;
      rawNodeMap.set(node.id, node);
    });
  
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
  
        if (!nodeIdSet.has(source) && rawNodeMap.has(source)) {
          const sourceNode = rawNodeMap.get(source);
          nodeElements.push({
            data: {
              id: sourceNode.id,
              label: sourceNode.name || sourceNode.id,
              shortLabel: (sourceNode.name || sourceNode.id).length > 22
                ? (sourceNode.name || sourceNode.id).slice(0, 20) + '...'
                : (sourceNode.name || sourceNode.id),
              ...sourceNode,
            }
          });
          nodeIdSet.add(source);
        }
  
        if (!nodeIdSet.has(target) && rawNodeMap.has(target)) {
          const targetNode = rawNodeMap.get(target);
          nodeElements.push({
            data: {
              id: targetNode.id,
              label: targetNode.name || targetNode.id,
              ...targetNode,
            }
          });
          nodeIdSet.add(target);
        }
  
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