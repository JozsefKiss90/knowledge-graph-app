import { groupColors } from "../../../styles/graphStyles"

export function applyPaletteAndTheme({ cy, darkMode, graphName, layerKey }) {
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
    const group = resolveNodeGroup(n);
    return (group && groupColors[group]) ? groupColors[group] : PALETTE.base;
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
      { selector: ".call-hidden", style: { display: "none" } },
      { selector: ".call-visible", style: { display: "element" } },
    ])
    .update();

  return PALETTE;
}