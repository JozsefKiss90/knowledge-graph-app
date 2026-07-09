import { groupColors } from "../../../styles/graphStyles"

export function applyPaletteAndTheme({ cy, darkMode, graphName, layerKey }) {
  const PALETTE = darkMode
    ? {
        root: "#5B7CFF",
        // Navbar body-text tone (--lc-text) rather than pure white: cuts glare
        // on the navy graph surface and reads as the same type system as the chrome.
        label: "#d7e6f7",
        border: "rgba(255,255,255,0.22)",
        base: "#6B8AFD",

        policy: "#22D3EE",
        strategy: "#34D399",
        cluster: "#A3E635",
        research_theme: "#FBBF24",
        institution: "#C084FC",
        topic: "#FDE047",
        synthesis: "#FB7185",
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
        synthesis: "rgba(244,63,94,0.86)",
        Destination: "rgba(59,130,246,0.88)",
        Call: "rgba(245,158,11,0.88)",

        edgeDefault: "rgba(100,116,139,0.55)",
        edgeBelongs: "rgba(16,185,129,0.65)",
        edgeShared: "rgba(59,130,246,0.70)",
        edgeCross: "rgba(245,158,11,0.70)",
        edgeDest: "rgba(59,130,246,0.70)",
        edgeCall: "rgba(245,158,11,0.70)",
      };

  const root = document.documentElement;
  root.style.setProperty("--nt-root", PALETTE.root);
  root.style.setProperty("--nt-policy", PALETTE.policy);
  root.style.setProperty("--nt-strategy", PALETTE.strategy);
  root.style.setProperty("--nt-cluster", PALETTE.cluster);
  root.style.setProperty("--nt-research_theme", PALETTE.research_theme);
  root.style.setProperty("--nt-institution", PALETTE.institution);
  root.style.setProperty("--nt-topic", PALETTE.topic);
  root.style.setProperty("--nt-synthesis", PALETTE.synthesis);
  root.style.setProperty("--nt-destination", PALETTE.Destination);
  root.style.setProperty("--nt-call", PALETTE.Call);
  root.style.setProperty("--nt-label", PALETTE.label);
  root.style.setProperty("--nt-border", PALETTE.border);

  // NEW: sync navigation-layer/group colors too
  root.style.setProperty("--nt-meta", groupColors.meta || PALETTE.root);
  root.style.setProperty("--nt-programme", groupColors.programme || PALETTE.strategy);
  root.style.setProperty("--nt-pillar", groupColors.pillar || PALETTE.cluster);
  root.style.setProperty("--nt-sp", groupColors.sp || PALETTE.policy);

  const resolveNodeGroup = (n) => {
    const g = n.data("group");
    if (g && groupColors[g]) return g;

    const tRaw = n.data("type") || n.data("category") || "";
    const t = String(tRaw).toLowerCase();

    if (t.includes("meta")) return "meta";

    if (t.includes("root")) {
      if (String(layerKey) === "ROOT" && n.id && n.id() === "ROOT_EU") return "meta";
      return "programme";
    }

    if (t.includes("sp")) return "sp";
    if (t.includes("pillar")) return "pillar";
    if (t.includes("programme") || t.includes("cluster")) return "programme";
    if (t.includes("destination")) return "destination";
    if (t.includes("call")) return "call";

    return null;
  };

  const nodeColorFor = (n) => {
    // Check type-specific palette colours first (policy, strategy, etc.)
    const tRaw = n.data("type") || n.data("category") || "";
    const t = String(tRaw);
    if (PALETTE[t]) return PALETTE[t];
    const tLower = t.toLowerCase();
    if (PALETTE[tLower]) return PALETTE[tLower];

    // Fall back to navigation-group colours
    const group = resolveNodeGroup(n);
    return (group && groupColors[group]) ? groupColors[group] : PALETTE.base;
  };

  const edgeColorFor = (e) => {
    const t = e.data("type") || "";
    if (t === "RELATES_TO") return PALETTE.edgeBelongs;
    if (t === "WIKI_LINK") return PALETTE.edgeShared;
    if (t === "BELONGS_TO_TOPIC") return PALETTE.edgeBelongs;
    if (t === "SHARED_TOPIC") return PALETTE.edgeShared;
    if (t === "CROSS_TOPIC_SIMILARITY") return PALETTE.edgeCross;
    if (t === "HAS_DESTINATION") return PALETTE.edgeDest;
    if (t === "HAS_CALL") return PALETTE.edgeCall;
    return PALETTE.edgeDefault;
  };

  const isHEWiki = graphName === "HE_2025";

  // For HE_2025: compute degree range for proportional node sizing + hub detection
  let minDeg = Infinity;
  let maxDeg = 0;
  let hubCut = Infinity;
  if (isHEWiki) {
    const degs = [];
    cy.nodes().forEach((n) => {
      const d = n.degree(false);
      degs.push(d);
      if (d < minDeg) minDeg = d;
      if (d > maxDeg) maxDeg = d;
    });
    if (minDeg === Infinity) minDeg = 0;
    // Hubs ≈ top third by degree; their labels persist when zoomed out (semantic zoom).
    if (degs.length) {
      const sorted = degs.slice().sort((a, b) => a - b);
      const idx = Math.min(Math.floor(sorted.length * 0.66), sorted.length - 1);
      hubCut = sorted[idx];
    }
  }

  const HE_MIN_SIZE = 22;
  const HE_MAX_SIZE = 62;
  const HE_FONT = 12.5;

  cy.nodes().forEach((n) => {
    n.data("themeColor", nodeColorFor(n));
    n.data("themeLabelColor", PALETTE.label);
    n.data("themeBorderColor", PALETTE.border);

    if (isHEWiki) {
      const deg = n.degree(false);
      const ratio = maxDeg > minDeg ? (deg - minDeg) / (maxDeg - minDeg) : 0.5;
      const size = HE_MIN_SIZE + ratio * (HE_MAX_SIZE - HE_MIN_SIZE);
      n.data("themeSize", Math.round(size));
      n.data("themeFontSize", HE_FONT);
      if (deg >= hubCut) n.data("heHub", true);
      else n.removeData("heHub");
    }
  });

  cy.edges().forEach((e) => {
    e.data("themeEdgeColor", edgeColorFor(e));
  });

  cy.scratch("graphName", graphName);
  cy.scratch("layerKey", layerKey);

  const extraStyles = [
    { selector: ".faded", style: { opacity: 0.15 } },
    { selector: ".call-hidden", style: { display: "none" } },
    { selector: ".call-visible", style: { display: "element" } },
    { selector: ".timeline-hidden", style: { display: "none" } },
    {
      selector: ".compare-selected",
      style: {
        "border-width": 4,
        "border-color": "#3d8fff",
        "border-opacity": 1,
        "overlay-opacity": 0.08,
        "overlay-color": "#3d8fff",
      },
    },
    // A3: assistant "act on the graph" highlight. Dedicated classes (NOT the
    // hover-managed highlighted/faded, which setupEvents wipes on mouseover) so
    // the highlight persists across layers until cleared. Violet = the assistant
    // accent, distinct from compare's blue and the amber Call fill.
    {
      selector: "node.assistant-match",
      style: {
        "border-width": 4,
        "border-color": "#8b5cf6",
        "border-opacity": 1,
        "overlay-color": "#8b5cf6",
        "overlay-opacity": 0.12,
        "z-index": 9999,
        "text-opacity": 1,
      },
    },
    { selector: "node.assistant-dim", style: { opacity: 0.22 } },
    // B4: country-activity overlay. Green accent (distinct from compare blue, assistant violet, the amber
    // Call fill). Two honest levels — coordinated (led) vs participated (joined) — plus a meaningful-absence
    // dim applied ONLY to CORDIS-covered calls the chosen country isn't active in (calls with no CORDIS data
    // stay neutral). Persists across layers until the overlay is closed / the country is cleared.
    {
      selector: "node.country-coord",
      style: {
        "border-width": 5,
        "border-color": "#10b981",
        "border-opacity": 1,
        "overlay-color": "#10b981",
        "overlay-opacity": 0.18,
        "z-index": 9998,
      },
    },
    {
      selector: "node.country-part",
      style: {
        "border-width": 4,
        "border-color": "#6ee7b7",
        "border-opacity": 1,
        "overlay-color": "#34d399",
        "overlay-opacity": 0.10,
      },
    },
    { selector: "node.country-dim", style: { opacity: 0.2 } },
    {
      selector: "node.assistant-focus",
      style: {
        "border-width": 6,
        "border-color": "#a78bfa",
        "border-opacity": 1,
        "overlay-color": "#8b5cf6",
        "overlay-opacity": 0.22,
        "z-index": 10000,
      },
    },
  ];

  if (isHEWiki) {
    extraStyles.push({
      selector: "node[themeSize]",
      style: {
        width: "data(themeSize)",
        height: "data(themeSize)",
        "font-size": "data(themeFontSize)",
      },
    });
  }

  cy.style().append(extraStyles).update();

  return PALETTE;
}