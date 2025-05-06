export function setupEvents(cy, navigate, onHoverNodeIdChange, onNodeHover) {
  cy.on('mouseover', 'node', (event) => {
    const node = event.target;
    const nodeData = node.data();
  
    // ✅ Restore the missing callback:
    if (onNodeHover) onNodeHover(nodeData);
    if (onHoverNodeIdChange) onHoverNodeIdChange(nodeData.id);
  
    const connectedEdges = node.connectedEdges();
    const connectedNodes = connectedEdges.connectedNodes();
  
    const allNodes = connectedNodes.union(node);
  
    cy.nodes().not(allNodes).addClass('faded');
    cy.edges().not(connectedEdges).addClass('faded');
  
    allNodes.addClass('highlighted');
    connectedEdges.addClass('highlighted');
  });
  
  cy.on('mouseout', 'node', () => {
    if (onHoverNodeIdChange) onHoverNodeIdChange(null);

    cy.nodes().removeClass('faded highlighted');
    cy.edges().removeClass('faded highlighted');
  });

  cy.on('tap', 'node', (event) => {
    const node = event.target;
    const id = node.data('id');
    if (id) {
      setTimeout(() => {
        navigate(`/node/${encodeURIComponent(id)}`);
      }, 100);
    } else {
      console.warn('⚠️ Node without valid ID clicked:', node.data());
    }
  });
}


/*export function setupEvents(cy, navigate, onHoverNodeIdChange, onNodeHover) {
    cy.on('mouseover', 'node', (event) => {
      const nodeData = event.target.data();
      if (onHoverNodeIdChange) onHoverNodeIdChange(nodeData.id);
      if (onNodeHover) onNodeHover(nodeData);
    });
  
    cy.on('mouseout', 'node', () => {
      if (onHoverNodeIdChange) onHoverNodeIdChange(null);
    });
  
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const id = node.data('id');
      if (id) {
        setTimeout(() => {
          navigate(`/node/${encodeURIComponent(id)}`);
        }, 100);
      } else {
        console.warn('⚠️ Node without valid ID clicked:', node.data());
      }
    });
  }

export default setupEvents*/