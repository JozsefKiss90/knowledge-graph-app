import { fitToViewport } from "../../GraphView/cy/fitViewport";

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
    fitToViewport(cyInstance, { reason: "reset" });

    if (initial) cyInstance.pan({ x: 0, y: 0 });
  };

  const handleFitView = () => {
    if (!cyInstance || cyInstance.destroyed?.()) return;
    try { cyInstance.resize(); } catch {}
    fitToViewport(cyInstance, { reason: "fit-button", animate: true });
  };

  const handleApplyLayout = (override) => {
    if (!cyInstance || cyInstance.destroyed?.()) return;
    const opts = override && override.name ? override : effectiveLayout;
    try {
      const l = cyInstance.layout(opts);
      l.one("layoutstop", () => fitToViewport(cyInstance, { reason: "apply-layout" }));
      l.run();
    } catch {}
  };

  return { layoutLabel, handleResetView, handleFitView, handleApplyLayout };
}
