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

   cy.nodes().on('mouseover', (event) => {
    const node = event.target;
      cy.userZoomingEnabled(false);

    if (onNodeHover) onNodeHover(node);
    if (onHoverNodeIdChange) onHoverNodeIdChange(node.id());

    cy.container().style.cursor = 'url("/cursor.ico"), auto';
  });

  cy.nodes().on('mouseout', () => {
    cy.container().style.cursor = 'default';
    if (onHoverNodeIdChange) onHoverNodeIdChange(null);
    if (onNodeHover) onNodeHover(null);
      cy.userZoomingEnabled(true);

  });
}