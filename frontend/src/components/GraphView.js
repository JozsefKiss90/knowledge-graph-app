// GraphView.js
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDarkMode } from "./context/DarkModeContext";
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import { stylesheet } from "../styles/graphStyles";
import { setupEvents } from "./utils/setupEvents";
import { useNavigate } from "react-router-dom";
cytoscape.use(coseBilkent);

/**
 * Props:
 *  - graphData: { nodeElements: [], edgeElements: [] } or { nodes: [], edges: [] }
 *  - graphName: string (dataset identifier used elsewhere)
 *  - layerKey: string (navigation layer key: ROOT | Cluster_* | DEST_*)
 *  - layoutOptions: { name: string, fit?: boolean, ... }
 *  - onCyReady(cy), onNodeHover(nodeData), onHoverNodeIdChange(nodeId)
 *  - nestedHandlers: { onClusterOpen, onDestinationToggle, popLevel }
 */
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
  },
  ref
) {
  // OUTER wrapper (relative) + inner Cytoscape container (absolute)
  const wrapperRef = useRef(null);
  const cyContainerRef = useRef(null);
  console.log("GraphView render", { graphName, graphData });
  const cyRef = useRef(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  const layoutName = layoutOptions?.name || "cose-bilkent";

  const nhRef = useRef(nestedHandlers);
  const hoverRef = useRef(onNodeHover);
  const hoverIdRef = useRef(onHoverNodeIdChange);
  const onCyReadyRef = useRef(onCyReady);
  const lastLayoutNameRef = useRef("cose-bilkent");
  const { darkMode } = useDarkMode();

  // ---- Glow overlay state (SVG circles) ----
  const [glowCircles, setGlowCircles] = useState([]);
  const rafGlowRef = useRef(0);
  const lastGlowKeyRef = useRef("");
  
  useEffect(() => {
    nhRef.current = nestedHandlers;
  }, [nestedHandlers]);
  useEffect(() => {
    hoverRef.current = onNodeHover;
  }, [onNodeHover]);
  useEffect(() => {
    hoverIdRef.current = onHoverNodeIdChange;
  }, [onHoverNodeIdChange]);
  useEffect(() => {
    onCyReadyRef.current = onCyReady;
  }, [onCyReady]);

  // flatten + (IMPORTANT) filter elements for cluster overview layer
  const elements = useMemo(() => {
    if (!graphData) return [];

    let nodes = Array.isArray(graphData.nodeElements)
      ? graphData.nodeElements
      : graphData.nodes || graphData.Nodes || [];

    let edges = Array.isArray(graphData.edgeElements)
      ? graphData.edgeElements
      : graphData.edges || graphData.Edges || [];

    // Cluster overview (Level 2): Calls must NOT be preloaded (layout/fit must ignore them)
    const isClusterOverview = String(layerKey || "").startsWith("Cluster_");
    if (isClusterOverview) {
      const callIds = new Set(
        nodes
          .filter((n) => {
            const d = n?.data || {};
            return d.type === "Call" || d.category === "Call";
          })
          .map((n) => n.data.id)
      );

      nodes = nodes.filter((n) => !callIds.has(n?.data?.id));

      edges = edges.filter((e) => {
        const d = e?.data || {};
        const isHasCall = d.type === "HAS_CALL" || d.category === "HAS_CALL";
        const touchesCall = callIds.has(d.source) || callIds.has(d.target);
        return !isHasCall && !touchesCall;
      });
    }

    return [...nodes, ...edges];
  }, [graphData, layerKey]);

  const layoutOptionsRef = useRef(layoutOptions);
  useEffect(() => {
    layoutOptionsRef.current = layoutOptions;
  }, [layoutOptions]);

  // --- helper: schedule glow update (RAF-throttled) ---
  const scheduleGlowUpdate = () => {
    if (rafGlowRef.current) return;
    rafGlowRef.current = window.requestAnimationFrame(() => {
      rafGlowRef.current = 0;
      const cy = cyRef.current;
      const wrap = wrapperRef.current;
      if (!cy || !wrap) return;

      const zoom = cy.zoom();
      const nodeCount = cy.nodes().length;

      // Render policy:
      // - For small graphs: glow all visible nodes.
      // - For large graphs: glow only “important” nodes.
      // - Also: if zoomed out far, restrict glow set to avoid clutter.
      const LARGE_GRAPH = 220;
      const ZOOM_LOW = 0.45;

      let nodesToGlow;

      if (nodeCount > LARGE_GRAPH || zoom < ZOOM_LOW) {
        nodesToGlow = cy.nodes(
          ".as-root, .as-cluster-root, .as-destination-root, .is-hovered, .highlighted, :selected"
        );
      } else {
        nodesToGlow = cy.nodes(":visible");
      }

      // Hard cap to protect DOM (deterministic order)
      const MAX_GLOWS = nodeCount > LARGE_GRAPH ? 140 : 260;

      const circles = [];
      const wrapRect = wrap.getBoundingClientRect();
      const w = wrapRect.width;
      const h = wrapRect.height;

      const pickColor = (n) => {
        if (n.hasClass("as-root")) return n.data("themeRootColor") || n.data("themeColor");
        if (n.hasClass("as-cluster-root"))
          return n.data("themeClusterRootColor") || n.data("themeColor");
        if (n.hasClass("as-destination-root"))
          return n.data("themeDestinationRootColor") || n.data("themeColor");
        return n.data("themeColor");
      };

      // only render circles that are actually on screen
      const onScreen = (x, y, r) => x + r >= 0 && y + r >= 0 && x - r <= w && y - r <= h;

      // stable selection + cap
      const arr = nodesToGlow.toArray();
      for (let i = 0; i < arr.length && circles.length < MAX_GLOWS; i++) {
        const n = arr[i];
        if (!n || n.removed()) continue;
        if (!n.visible()) continue;

        const p = n.renderedPosition();
        const rw = n.renderedWidth();
        const rh = n.renderedHeight();
        const r = Math.max(rw, rh) * 0.42 + 4; // slightly larger than node to show glow

        const x = p.x;
        const y = p.y;

        if (!onScreen(x, y, r)) continue;

        const color = pickColor(n) || "rgba(91,124,255,0.9)";
        const strong = n.hasClass("as-root") ||
          n.hasClass("as-cluster-root") ||
          n.hasClass("as-destination-root") ||
          n.hasClass("is-hovered") ||
          n.hasClass("highlighted") ||
          n.selected();

        circles.push({
          id: n.id(),
          x,
          y,
          r,
          color,
          strong,
        });
      }

      // Reduce React re-renders: update state only if key changed meaningfully
      const key = circles
        .map((c) => `${c.id}:${Math.round(c.x)}:${Math.round(c.y)}:${Math.round(c.r)}:${c.strong ? 1 : 0}`)
        .join("|");

      if (key !== lastGlowKeyRef.current) {
        lastGlowKeyRef.current = key;
        setGlowCircles(circles);
      }
    });
  };

  useEffect(() => {
    if (!cyContainerRef.current) return;

    // destroy previous instance if any
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

    const PALETTE = darkMode
      ? {
          root: "#5B7CFF",
          label: "#F3F6FF",
          border: "rgba(255,255,255,0.22)",
          base: "#6B8AFD",

          policy: "#22D3EE",
          strategy: "#34D399",
          cluster: "#A3E635",
          research_theme: "#FBBF24",
          institution: "#C084FC",
          topic: "#FDE047",
          Destination: "#60A5FA",
          Call: "#F59E0B",

          edgeDefault: "rgba(148,163,184,0.65)",
          edgeBelongs: "rgba(16,185,129,0.80)",
          edgeShared: "rgba(59,130,246,0.85)",
          edgeCross: "rgba(245,158,11,0.85)",
          edgeDest: "rgba(96,165,250,0.85)",
          edgeCall: "rgba(245,158,11,0.85)",
        }
      : {
          root: "rgba(91,124,255,0.92)",
          label: "#0B1220",
          border: "rgba(2,6,23,0.20)",
          base: "rgba(91,124,255,0.92)",

          policy: "rgba(0,173,196,0.92)",
          strategy: "rgba(34,197,94,0.90)",
          cluster: "rgba(132,204,22,0.88)",
          research_theme: "rgba(234,179,8,0.90)",
          institution: "rgba(147,51,234,0.86)",
          topic: "rgba(202,138,4,0.86)",
          Destination: "rgba(59,130,246,0.88)",
          Call: "rgba(245,158,11,0.88)",

          edgeDefault: "rgba(100,116,139,0.55)",
          edgeBelongs: "rgba(16,185,129,0.65)",
          edgeShared: "rgba(59,130,246,0.70)",
          edgeCross: "rgba(245,158,11,0.70)",
          edgeDest: "rgba(59,130,246,0.70)",
          edgeCall: "rgba(245,158,11,0.70)",
        };

    // Sync CSS variables used by toggle buttons
    const root = document.documentElement;
    root.style.setProperty("--nt-root", PALETTE.root);
    root.style.setProperty("--nt-policy", PALETTE.policy);
    root.style.setProperty("--nt-strategy", PALETTE.strategy);
    root.style.setProperty("--nt-cluster", PALETTE.cluster);
    root.style.setProperty("--nt-research_theme", PALETTE.research_theme);
    root.style.setProperty("--nt-institution", PALETTE.institution);
    root.style.setProperty("--nt-topic", PALETTE.topic);
    root.style.setProperty("--nt-destination", PALETTE.Destination);
    root.style.setProperty("--nt-call", PALETTE.Call);
    root.style.setProperty("--nt-label", PALETTE.label);
    root.style.setProperty("--nt-border", PALETTE.border);

    const nodeColorFor = (n) => {
      const t = n.data("type") || n.data("category") || "";
      return PALETTE[t] || PALETTE.base;
    };

    const edgeColorFor = (e) => {
      const t = e.data("type") || "";
      if (t === "BELONGS_TO_TOPIC") return PALETTE.edgeBelongs;
      if (t === "SHARED_TOPIC") return PALETTE.edgeShared;
      if (t === "CROSS_TOPIC_SIMILARITY") return PALETTE.edgeCross;
      if (t === "HAS_DESTINATION") return PALETTE.edgeDest;
      if (t === "HAS_CALL") return PALETTE.edgeCall;
      return PALETTE.edgeDefault;
    };

    // assign theme fields consumed by graphStyles.js + overlay
    cy.nodes().forEach((n) => {
      n.data("themeColor", nodeColorFor(n));
      n.data("themeLabelColor", PALETTE.label);
      n.data("themeBorderColor", PALETTE.border);
    });

    cy.edges().forEach((e) => {
      e.data("themeEdgeColor", edgeColorFor(e));
    });

    cy.scratch("graphName", graphName);
    cy.scratch("layerKey", layerKey);

    cy.style()
      .append([
        { selector: ".faded", style: { opacity: 0.15 } },
        { selector: ".highlighted", style: { "border-width": 2, "border-color": "#fff" } },
        { selector: ".call-hidden", style: { display: "none" } },
        { selector: ".call-visible", style: { display: "element" } },
      ])
      .update();

    const cleanLayerKey = String(layerKey || "").replace("_cose", "");
    const isRootLayer = cleanLayerKey === "ROOT";
    const isClusterOverview = cleanLayerKey.startsWith("Cluster_");
    const isDestinationLayer = cleanLayerKey.startsWith("DEST_");

    cy.nodes().removeClass("as-root as-cluster-root as-destination-root");
    if (!isRootLayer) cy.nodes(".as-root").removeClass("as-root");

    let rootNode = null;

    if (isRootLayer) {
      rootNode = cy.$id("ROOT_HE");
      if (!rootNode || rootNode.empty()) {
        rootNode = cy.nodes("node[type='root'], node[category='root']").first();
      }
    } else if (isDestinationLayer) {
      rootNode = cy.nodes("node[type='Destination'], node[category='Destination']").first();
    } else if (isClusterOverview) {
      rootNode = cy.$id(cleanLayerKey);
      if (!rootNode || rootNode.empty()) {
        rootNode = cy
          .nodes(
            "node[type='cluster'], node[category='cluster'], node[type='Cluster'], node[category='Cluster']"
          )
          .first();
      }
      if (!rootNode || rootNode.empty()) {
    
        const nodesAll = cy.nodes();
        if (nodesAll.length > 0) {
          const md = nodesAll.maxDegree(false);
          rootNode = (md && md.ele) ? md.ele : nodesAll.first();
        } else {
          rootNode = null; // or leave as null and render empty state elsewhere
        }
              }
            }

    if (rootNode && !rootNode.empty()) {
      if (isRootLayer) {
        rootNode.addClass("as-root");
        rootNode.data("themeRootColor", PALETTE.root);
      } else if (isDestinationLayer) {
        rootNode.addClass("as-destination-root");
        rootNode.data("themeDestinationRootColor", PALETTE.Destination);
      } else if (isClusterOverview) {
        rootNode.addClass("as-cluster-root");
        rootNode.data("themeClusterRootColor", PALETTE.cluster);
      }
    }

    const createLayout = () => {
      const opts = layoutOptionsRef.current || {};
      const name = opts.name || layoutName || "cose-bilkent";
      const fit = opts.fit !== false;

      if (name === "breadthfirst") {
        let roots;

        if (isClusterOverview) {
          const rootNodes = cy.nodes("node[type = 'cluster'], node[category = 'cluster']");
          if (rootNodes.length > 0) roots = rootNodes;
        } else if (isDestinationLayer) {
          const rootNodes = cy.nodes("node[type = 'Destination'], node[category = 'Destination']");
          if (rootNodes.length > 0) roots = rootNodes;
        }

        return cy.layout({
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
          roots: roots && roots.length > 0 ? roots : undefined,
        });
      }

      return cy.layout({
        ...opts,
        name,
        fit,
        animate: false,
        randomize:
          typeof opts.randomize === "boolean"
            ? opts.randomize
            : isClusterOverview
            ? true
            : false,
      });
    };

    const layout = createLayout();
    layout.on("layoutstop", () => {
      setReady(true);
      scheduleGlowUpdate();
    });
    layout.run();

    // events
    setupEvents(
      cy,
      navigate,
      (id) => hoverIdRef.current && hoverIdRef.current(id),
      (data) => hoverRef.current && hoverRef.current(data),
      {
        shouldOpenCluster: () => String(layerKey || "").replace("_cose", "") === "ROOT",
        onClusterOpen: (data) => nhRef.current?.onClusterOpen?.(data),
        onDestinationToggle: (_, id) => nhRef.current?.onDestinationToggle?.(cy, id),
      }
    );

    // ---- Hook glow updates to high-signal events only (RAF-throttled) ----
    const onAny = () => scheduleGlowUpdate();

    cy.on("pan zoom resize", onAny);
    cy.on("drag position", "node", onAny);
    cy.on("select unselect", "node", onAny);
    cy.on("add remove", onAny);
    cy.on("layoutstop", onAny);
    cy.on("render", () => {
      // render can be very frequent; RAF + key-diff ensures it stays bounded
      scheduleGlowUpdate();
    });

    // initial
    scheduleGlowUpdate();

    onCyReadyRef.current && onCyReadyRef.current(cy);

    return () => {
      try {
        cy.off("pan zoom resize", onAny);
        cy.off("drag position", "node", onAny);
        cy.off("select unselect", "node", onAny);
        cy.off("add remove", onAny);
        cy.off("layoutstop", onAny);
        cy.off("render");
      } catch {}

      if (rafGlowRef.current) {
        window.cancelAnimationFrame(rafGlowRef.current);
        rafGlowRef.current = 0;
      }

      try {
        cy.destroy();
      } catch {}
      cyRef.current = null;
      setReady(false);
      setGlowCircles([]);
      lastGlowKeyRef.current = "";
    };
  }, [elements, graphName, layerKey, navigate, darkMode]);

  useImperativeHandle(ref, () => ({
    rerunLayout: () => {
      const cy = cyRef.current;
      if (!cy) return;

      const prevName = lastLayoutNameRef.current;
      const opts = layoutOptionsRef.current || {};
      const name = opts.name || "cose-bilkent";
      const fit = opts.fit !== false;

      const isClusterOverview = String(layerKey || "").startsWith("Cluster_");
      const comingFromTree =
        isClusterOverview && prevName === "breadthfirst" && name !== "breadthfirst";

      if (isClusterOverview && comingFromTree) {
        const root = cy.nodes("node[type = 'cluster'], node[category = 'cluster']").first();
        if (root && root.nonempty()) root.position({ x: 0, y: -200 });
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
      if (fit) cy.fit(cy.elements(), 80);
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
        opacity: ready ? 1 : 0,
      }}
    >
      {/* Cytoscape renders here */}
      <div
        ref={cyContainerRef}
        style={{ position: "absolute", inset: 0 }}
      />

      {/* DOM-efficient glow overlay (single SVG) */}
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 5,
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
            // Multi-ring neon feel via multiple drop-shadows (per-circle, per-color)
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
