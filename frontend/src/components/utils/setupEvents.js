export function setupEvents(cy, navigate, onHoverNodeIdChange, onNodeHover) {
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

export default setupEvents