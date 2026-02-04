import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";

import { useDarkMode } from "../context/DarkModeContext";
import { stylesheet } from "../../styles/graphStyles";
import { setupEvents } from "../utils/setupEvents";

import { useLatestRefs } from "./useLatestRefs";
import { useGraphElements } from "./useGraphElements";
import { useGlowOverlay } from "./useGlowOverlay";

import { applyPaletteAndTheme } from "./cy/palette";
import { tagRootNode } from "./cy/rootTagging";
import { createStabilizer } from "./cy/stabilization";
import { createLayoutFactory } from "./cy/createLayout";

cytoscape.use(coseBilkent);

const GraphView = forwardRef(function GraphView(
  {
    graphData,
    graphName,
    layerKey,
    layoutOptions = { name: "cose-bilkent" },
    onCyReady,
    onNodeHover,
    onHoverNodeIdChange,
    nestedHandlers,
    onOpenDetail,
  },
  ref
) {
  const wrapperRef = useRef(null);
  const cyContainerRef = useRef(null);
  const cyRef = useRef(null);

  const [isShown, setIsShown] = useState(false);
  const navigate = useNavigate();
  const { darkMode } = useDarkMode();

  const { nhRef, hoverRef, hoverIdRef, onCyReadyRef, layoutOptionsRef, lastLayoutNameRef } =
    useLatestRefs({
      nestedHandlers,
      onNodeHover,
      onHoverNodeIdChange,
      onCyReady,
      layoutOptions,
    });

  const elements = useGraphElements(graphData, layerKey);

  const { glowCircles, scheduleGlowUpdate, resetGlow, glowRafRef } = useGlowOverlay({
    cyRef,
    wrapperRef,
  });

  // Centering safety refs
  const didInitialAutoFitRef = useRef(false);
  const lastContainerSizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    if (!cyContainerRef.current) return;

    didInitialAutoFitRef.current = false;
    lastContainerSizeRef.current = { w: 0, h: 0 };

    if (cyRef.current) {
      try {
        cyRef.current.destroy();
      } catch {}
      cyRef.current = null;
    }

     const cy = cytoscape({
      container: cyContainerRef.current,
      elements,
      style: stylesheet,
      minZoom: 0.1,
      maxZoom: 4,
      selectionType: "single",
      pixelRatio: 1,
    });

    cyRef.current = cy;

    // Expose cy to parent
    try {
      onCyReadyRef.current?.(cy);
    } catch {}

    // Theme + CSS vars + data fields
    const PALETTE = applyPaletteAndTheme({ cy, darkMode, graphName, layerKey });

    // Root tagging / classes
    const layerMeta = tagRootNode({ cy, layerKey, PALETTE });

    // Stabilization
    const stabilizer = createStabilizer({
      cy,
      wrapperRef,
      scheduleGlowUpdate,
      didInitialAutoFitRef,
      lastContainerSizeRef,
      onDidInitialFit: () => setIsShown(true),
    });

    // Layout
    const makeLayout = createLayoutFactory({ cy, layoutOptionsRef, layerMeta });

    const layout = makeLayout();
    layout.on("layoutstop", () => {
      scheduleGlowUpdate();
      stabilizer.schedule(true);
    });
    layout.run();

    // Kick once after mount
    stabilizer.schedule(true);

    // events
   setupEvents(
      cy,
      navigate,
      (id) => hoverIdRef.current && hoverIdRef.current(id),
      (data) => hoverRef.current && hoverRef.current(data),
      {
        shouldOpenCluster: () =>
          String(layerKey || "").replace("_cose", "") === "ROOT",
        onClusterOpen: (data) => nhRef.current?.onClusterOpen?.(data),
        onDestinationToggle: (_, id) =>
          nhRef.current?.onDestinationToggle?.(cy, id),
        // NEW: let clicks open inline detail when provided
        openNodeDetail: onOpenDetail,
      }
    );

    // Glow updates on high-signal events only
    const onAny = () => scheduleGlowUpdate();
    cy.on("pan zoom", onAny);
    cy.on("drag position", "node", onAny);
    cy.on("select unselect", "node", onAny);
    cy.on("add remove", onAny);
    cy.on("layoutstop", onAny);

    // NEW: hover should also update overlay glow strength (is-hovered / highlighted)
    cy.on("mouseover", "node", onAny);
    cy.on("mouseout", "node", onAny);

    // Optional: if you use edge hover highlighting anywhere
    cy.on("mouseover", "edge", onAny);
    cy.on("mouseout", "edge", onAny);


    scheduleGlowUpdate();

    // Window resize: preserve user viewport (no re-fit)
    const onWindowResize = () => stabilizer.schedule(false);
    window.addEventListener("resize", onWindowResize, { passive: true });

    return () => {
      try {
        cy.off("mouseover", "node", onAny);
        cy.off("mouseout", "node", onAny);
        cy.off("mouseover", "edge", onAny);
        cy.off("mouseout", "edge", onAny);
      } catch {}

      window.removeEventListener("resize", onWindowResize);

      stabilizer.cleanup();

      if (glowRafRef.current) {
        window.cancelAnimationFrame(glowRafRef.current);
        glowRafRef.current = 0;
      }

      try {
        cy.destroy();
      } catch {}

      cyRef.current = null;
      setIsShown(false);
      resetGlow();
    };
    }, [
    elements,
    graphName,
    layerKey,
    navigate,
    darkMode,
    nhRef,
    hoverRef,
    hoverIdRef,
    onCyReadyRef,
    layoutOptionsRef,
    scheduleGlowUpdate,
    resetGlow,
    glowRafRef,
    // IMPORTANT: do NOT include onOpenDetail here – it’s only used for event callbacks
  ]);
  
  useImperativeHandle(ref, () => ({
    rerunLayout: () => {
      const cy = cyRef.current;
      if (!cy) return;

      const prevName = lastLayoutNameRef.current;
      const opts = layoutOptionsRef.current || {};
      const name = opts.name || "cose-bilkent";
      const fit = opts.fit !== false;

      const cleanLayerKey = String(layerKey || "").replace("_cose", "");
      const isClusterOverview = cleanLayerKey.startsWith("Cluster_");

      const comingFromTree =
        isClusterOverview && prevName === "breadthfirst" && name !== "breadthfirst";

      if (isClusterOverview && comingFromTree) {
        const root = cy.nodes("node[type='cluster'], node[category='cluster']").first();
        if (root && !root.empty()) root.position({ x: 0, y: -200 });
      }

      if (comingFromTree) {
        cy.batch(() => {
          const w = cy.width() || 1000;
          const h = cy.height() || 800;
          cy.nodes().forEach((n) => {
            n.position({
              x: (Math.random() - 0.5) * w * 0.6,
              y: (Math.random() - 0.5) * h * 0.6,
            });
          });
        });
      }

      const layout =
        name === "breadthfirst"
          ? cy.layout({
              ...opts,
              name: "breadthfirst",
              fit,
              animate: false,
              directed: true,
              padding: 80,
              spacingFactor: 1.2,
              circle: false,
              orientation: "vertical",
              nodeDimensionsIncludeLabels: true,
            })
          : cy.layout({
              ...opts,
              name,
              fit,
              animate: false,
              randomize: comingFromTree ? true : false,
            });

      layout.run();
      if (fit) {
        const w = cy.width() || 0;
        const pad = w <= 700 ? 18 : 34;
        cy.fit(cy.elements(":visible"), pad);
      }


      lastLayoutNameRef.current = name;
    },
    getCy: () => cyRef.current,
  }));

  return (
    <div
      data-graph-name={graphName}
      ref={wrapperRef}
      className="cytoscape_container"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        opacity: isShown ? 1 : 0,
        overflow: "visible",
      }}
    >
    <div
      ref={cyContainerRef}
      style={{ position: "absolute", inset: 0, zIndex: 1 }}
    />

      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 50,
          overflow: "visible",
        }}
      >
        {glowCircles.map((c) => (
          <circle
            key={c.id}
            cx={c.x}
            cy={c.y}
            r={c.r}
            fill="transparent"
            stroke={c.color}
            strokeWidth={c.strong ? 1.8 : 1.2}
            opacity={c.strong ? 0.92 : 0.72}
            style={{
              filter: c.strong
                ? `drop-shadow(0 0 16px ${c.color})
                   drop-shadow(0 0 28px ${c.color})
                   drop-shadow(0 0 50px ${c.color})`
                : `drop-shadow(0 0 16px ${c.color})
                   drop-shadow(0 0 26px ${c.color})`,
            }}
          />
        ))}
      </svg>
    </div>
  );
});

export default GraphView;
