export function createViewControls({ cyInstance, effectiveLayout }) {
  const layoutLabel =
    effectiveLayout?.name === "breadthfirst" ? "Hierarchical Layout" : "Force-Directed Layout";

  const handleResetView = (initial = false) => {
    if (!cyInstance || cyInstance.destroyed?.()) return;
    cyInstance.elements().show();
    cyInstance.nodes().removeClass("faded highlighted");
    cyInstance.edges().removeClass("faded");
    cyInstance.nodes().unselect();

    try { cyInstance.resize(); } catch {}
    cyInstance.fit({ padding: 60 });

    if (initial) cyInstance.pan({ x: 0, y: 0 });
  };

  const handleFitView = () => {
    if (!cyInstance || cyInstance.destroyed?.()) return;
    try { cyInstance.resize(); } catch {}

    try {
      cyInstance.animate({
        fit: { eles: cyInstance.elements(":visible"), padding: 60 },
        duration: 300,
      });
    } catch {
      cyInstance.fit({ padding: 60 });
    }
  };

  const handleApplyLayout = () => {
    if (!cyInstance || cyInstance.destroyed?.()) return;
    try {
      cyInstance.animate({
        fit: { eles: cyInstance.elements(":visible"), padding: 60 },
        duration: 300,
      });
    } catch {}
  };

  return { layoutLabel, handleResetView, handleFitView, handleApplyLayout };
}
