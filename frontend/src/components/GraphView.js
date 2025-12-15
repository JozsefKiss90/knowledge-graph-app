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
  const containerRef = useRef(null);
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

  useEffect(() => { nhRef.current = nestedHandlers; }, [nestedHandlers]);
  useEffect(() => { hoverRef.current = onNodeHover; }, [onNodeHover]);
  useEffect(() => { hoverIdRef.current = onHoverNodeIdChange; }, [onHoverNodeIdChange]);
  useEffect(() => { onCyReadyRef.current = onCyReady; }, [onCyReady]);

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

  useEffect(() => {
    if (!containerRef.current) return;

    // destroy previous instance if any
    if (cyRef.current) {
      try { cyRef.current.destroy(); } catch {}
      cyRef.current = null;
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: stylesheet,
      minZoom: 0.1,
      maxZoom: 4,
      selectionType: "single",
      pixelRatio: 1,
    });
    cyRef.current = cy;

// GraphView.js (inside the cy init useEffect, after `const cy = cytoscape({ ... })`)

const PALETTE = darkMode
  ? {
      // Dark: slightly restrained chroma, higher opacity, “neon” reads well on dark
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
      // Light: higher chroma + slightly lower opacity, to keep “air” on white
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

    // assign theme fields consumed by graphStyles.js
    cy.nodes().forEach((n) => {
      n.data("themeColor", nodeColorFor(n));
      n.data("themeLabelColor", PALETTE.label);
      n.data("themeBorderColor", PALETTE.border);
    });

    cy.edges().forEach((e) => {
      e.data("themeEdgeColor", edgeColorFor(e));
    });

    // Optional: subtle neon glow (Cytoscape supports "shadow-*")
    cy.style()
      .selector("node")
      .style({
        "shadow-blur": darkMode ? 10 : 8,
        "shadow-opacity": darkMode ? 0.28 : 0.18,
        "shadow-offset-x": 0,
        "shadow-offset-y": 0,
        "shadow-color": "data(themeColor)",
      })
      .selector(".is-hovered, .highlighted")
      .style({
        "shadow-blur": darkMode ? 16 : 12,
        "shadow-opacity": darkMode ? 0.42 : 0.26,
        "border-width": 2,
        "border-color": "data(themeColor)",
      })
      .update();

    cy.scratch("graphName", graphName);
    cy.scratch("layerKey", layerKey);

        // Theme-aware label colors (Cytoscape style override)
    const labelColor = darkMode ? "#f9fafb" : "#1A2332";
    cy.style()
      .selector("node")
      .style({ color: labelColor })
      .selector(".is-hovered")
      .style({ color: labelColor })
      .update();

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
      // Synthetic ROOT uses id "ROOT_HE"
      rootNode = cy.$id("ROOT_HE");
      console.log("rootNode for ROOT layer:", rootNode);
      if (!rootNode || rootNode.empty()) {
        rootNode = cy.nodes("node[type='root'], node[category='root']").first();
      }
    } else if (isDestinationLayer) {
      // DEST_* layer: the Destination node is the “center”
      rootNode = cy.nodes("node[type='Destination'], node[category='Destination']").first();
      console.log("rootNode for DEST layer:", rootNode);
    
   } else if (isClusterOverview) {
      // 1) Most reliable: try the layer key as the node id (e.g. "Cluster_6")
      rootNode = cy.$id(cleanLayerKey);

      // 2) Fallback: accept case variants and category variants
      if (!rootNode || rootNode.empty()) {
        rootNode = cy.nodes(
          "node[type='cluster'], node[category='cluster'], node[type='Cluster'], node[category='Cluster']"
        ).first();
      }

      // 3) Final fallback: highest-degree node (center-ish in star layouts)
      if (!rootNode || rootNode.empty()) {
        rootNode = cy.nodes().maxDegree(false).ele;
      }

      console.log("rootNode for Cluster layer:", rootNode);
    }

    if (rootNode && !rootNode.empty()) {
      if (isRootLayer) rootNode.addClass("as-root");
      else if (isDestinationLayer) rootNode.addClass("as-destination-root");
      else if (isClusterOverview) rootNode.addClass("as-cluster-root");
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

      // default: force-directed
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
    layout.on("layoutstop", () => setReady(true));
    layout.run();

    // events
    setupEvents(
      cy,
      navigate,
      (id) => hoverIdRef.current && hoverIdRef.current(id),
      (data) => hoverRef.current && hoverRef.current(data),
      {
        // ROOT click-to-open must work regardless of any dataset naming conventions
        shouldOpenCluster: () => String(layerKey || "").replace("_cose", "") === "ROOT",
        onClusterOpen: (data) => nhRef.current?.onClusterOpen?.(data),
        onDestinationToggle: (_, id) => nhRef.current?.onDestinationToggle?.(cy, id),
      }
    );

    onCyReadyRef.current && onCyReadyRef.current(cy);

    return () => {
      try { cy.destroy(); } catch {}
      cyRef.current = null;
      setReady(false);
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
      ref={containerRef}
      className="cytoscape_container"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        opacity: ready ? 1 : 0,
      }}
    />
  );
});

export default GraphView;
