import { useEffect, useMemo, useRef, useState } from "react";
import { useCy } from "./context/CyContext";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { IconButton } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import SearchBox from "./LegendParts/SearchBox";
import ScoreFilter from "./LegendParts/ScoreFilter";
import GraphSelector from "./LegendParts/GraphSelector";
import LayoutSwitcher from "./LegendParts/LayoutSwitcher";
import EdgeTypeToggle from "./LegendParts/EdgeTypeToggle";
import NodeTypeToggle from "./LegendParts/NodeTypeToggle";

import { getEdgeTypeList, getNodeTypeList } from "./LegendParts/graphTypeConfig";

// Re-usable outlined, collapsible section shell
const LegendSection = ({ title, isOpen, onToggle, children }) => (
  <Box className="legend-section" sx={{ width: "100%", boxSizing: "border-box" }}>
    <Box className="legend-section-header" onClick={onToggle}>
      <Typography className="legend-section-title" variant="subtitle2">
        {title}
      </Typography>
      <IconButton
        size="small"
        className="legend-section-toggle"
        aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
      >
        {isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </IconButton>
    </Box>
    {isOpen && <Box className="legend-section-body">{children}</Box>}
  </Box>
);

const normalizeGraphName = (name) => String(name || "").replace("_cose", "");

function resolveRootLabel(cleanGraphName) {
  if (cleanGraphName === "ROOT") return "Funding Programmes";

  if (
    cleanGraphName === "Horizon Europe" ||
    cleanGraphName === "Digital Europe" ||
    cleanGraphName === "Erasmus+" ||
    cleanGraphName === "Connecting Europe Facility (CEF)" ||
    cleanGraphName === "Creative Europe (CREA)" ||
    cleanGraphName === "EURATOM" ||
    cleanGraphName === "WIDERA" ||
    cleanGraphName === "MSCA" ||
    cleanGraphName === "INFRA" ||
    cleanGraphName === "EIC" ||
    cleanGraphName === "EIE" ||
    cleanGraphName === "MISS" ||
    /^PILLAR_/i.test(cleanGraphName)
  ) {
    return "Programme";
  }

  if (/^Cluster_/i.test(cleanGraphName)) return "Cluster";
  if (/^DEST_/i.test(cleanGraphName)) return "Destination";

  return "Programme";
}

function collectLayerNodeTypes(cy, graphName) {
  if (!cy || cy.destroyed()) return [];

  const cleanGraphName = normalizeGraphName(graphName);
  const typeToColorCounts = new Map();

  cy.nodes().forEach((n) => {
    const t = n.data("type") || n.data("category");
    if (!t) return;

    let key = String(t);

    try {
      if (n.hasClass?.("as-root")) {
        key = "root";
      }
    } catch {}
    
    let color;
    try {
      color = n.style("background-color");
    } catch {
      color = undefined;
    }
    if (!color) return;

    if (!typeToColorCounts.has(key)) typeToColorCounts.set(key, new Map());
    const cmap = typeToColorCounts.get(key);
    cmap.set(color, (cmap.get(color) || 0) + 1);
  });

  const out = [];
  for (const [type, cmap] of typeToColorCounts.entries()) {
    let bestColor;
    let bestCount = -1;
    for (const [c, count] of cmap.entries()) {
      if (count > bestCount) {
        bestCount = count;
        bestColor = c;
      }
    }

    const label =
      String(type).toLowerCase() === "root"
        ? resolveRootLabel(cleanGraphName)
        : String(type).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

    out.push({
      type,
      label,
      color: bestColor,
    });
  }

  return out;
}
function collectLayerEdgeTypes(cy) {
  if (!cy || cy.destroyed()) return new Set();
  const s = new Set();
  cy.edges().forEach((e) => {
    const t = e.data("type") || e.data("category");
    if (t) s.add(t);
  });
  return s;
}

function selectorForType(cy, type) {
  if (type === "root") {
    return cy.nodes(".as-root");
  }
  return cy.nodes(`[type = "${type}"], [category = "${type}"]`);
}

function isNodeTypeActuallyVisible(cy, type) {
  if (!cy || cy.destroyed()) return false;
  const els = selectorForType(cy, type);
  if (!els || els.length === 0) return false;

  return els.some((el) => {
    try {
      const explicitlyHidden = typeof el.hidden === "function" ? el.hidden() : false;
      const classHidden = el.hasClass?.("call-hidden");
      return !explicitlyHidden && !classHidden;
    } catch {
      return false;
    }
  });
}

const LegendToggle = ({
  hoveredNodeRef,
  graphName,
  setGraphName,
  onCollapse,
  loadFromStore,
  onRequestNavigate,
  selectedNodeId,
  setSelectedNodeId,
}) => {
  const cy = useCy();
  const scrollRef = useRef(null);

  const cleanGraphName = normalizeGraphName(graphName);
  const isHE2025 = cleanGraphName === "HE_2025";

  const layerNodeTypes = useMemo(
    () => collectLayerNodeTypes(cy, graphName),
    [cy, graphName]
  );
  
  const layerEdgeTypesSet = useMemo(() => collectLayerEdgeTypes(cy), [cy, graphName]);

const nodeTypeList = useMemo(() => {
  const present = new Map(layerNodeTypes.map((x) => [x.type, x]));

  if (isHE2025) {
    const configured = getNodeTypeList("HE_2025");
    return configured
      .filter((x) => present.has(x.type))
      .map((x) => ({
        ...present.get(x.type),
        ...x,
      }));
  }

  let items = layerNodeTypes;

  const hasProgrammeRoot = present.has("root");
  if (hasProgrammeRoot) {
    items = items.filter((x) => {
      const t = String(x.type).toLowerCase();
      return t !== "cluster";
    });
  }

  return items;
}, [isHE2025, layerNodeTypes]);
  const edgeTypeList = useMemo(() => {
    if (!isHE2025) return [];
    const configured = getEdgeTypeList("HE_2025");
    return configured.filter((x) => layerEdgeTypesSet.has(x.type));
  }, [isHE2025, layerEdgeTypesSet]);

  const [visibleNodeTypes, setVisibleNodeTypes] = useState(new Set());
  const [visibleEdgeTypes, setVisibleEdgeTypes] = useState(new Set());

  useEffect(() => {
    if (!cy || cy.destroyed()) {
      setVisibleNodeTypes(new Set(nodeTypeList.map((x) => x.type)));
      return;
    }

    const nextVisible = new Set(
      nodeTypeList
        .map((x) => x.type)
        .filter((type) => isNodeTypeActuallyVisible(cy, type))
    );

    if (selectorForType(cy, "root").filter(":visible").length > 0) {
      nextVisible.add("root");
    }
    nextVisible.delete("cluster");

    setVisibleNodeTypes(nextVisible);
  }, [cy, graphName, nodeTypeList]);

  useEffect(() => {
    setVisibleEdgeTypes(new Set(edgeTypeList.map((x) => x.type)));
  }, [cy, graphName, edgeTypeList]);

  const [sectionsOpen, setSectionsOpen] = useState({
    dataset: true,
    layout: true,
    edgeTypes: true,
    nodeTypes: true,
    search: true,
    similarity: true,
  });

  const toggleSection = (key) =>
    setSectionsOpen((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));

  useEffect(() => {
    const handleWheel = (e) => {
      const hoverPane = document.querySelector(".hovered-node-info");
      if (!hoverPane) return;

      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!hoverPane.contains(target)) return;

      hoverPane.scrollTop += e.deltaY;
      e.preventDefault();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  const toggleType = (type, typeSet, setter, selectorFn) => {
    if (!cy || cy.destroyed()) return;

    const newSet = new Set(typeSet);
    const elements = selectorFn(type);

    if (newSet.has(type)) {
      newSet.delete(type);

      if (type === "Call") {
        elements.addClass("call-hidden");
      }
      elements.hide();
    } else {
      newSet.add(type);

      if (type === "Call") {
        elements.removeClass("call-hidden");
      }
      elements.show();
    }

    setter(newSet);
  };

  useEffect(() => {
    if (!cy || cy.destroyed()) return;

    const onSel = (evt) => {
      try {
        setSelectedNodeId(evt?.target?.id?.() || null);
      } catch {
        setSelectedNodeId(null);
      }
    };
    const onUnsel = () => setSelectedNodeId(null);

    cy.on("select", "node", onSel);
    cy.on("unselect", "node", onUnsel);

    return () => {
      try {
        cy.off("select", "node", onSel);
        cy.off("unselect", "node", onUnsel);
      } catch {}
    };
  }, [cy, graphName, setSelectedNodeId]);

  const resetView = () => {
    if (!cy || cy.destroyed()) return;

    cy.elements().show();
    cy.nodes().removeClass("faded highlighted is-hovered");
    cy.edges().removeClass("faded highlighted");
    cy.nodes().unselect();

    const shouldDefaultHideCalls =
      cleanGraphName !== "ROOT" &&
      cleanGraphName !== "HE_2025" &&
      !/^PILLAR_/i.test(cleanGraphName) &&
      !/^DEST_/i.test(cleanGraphName) &&
      cleanGraphName !== "WIDERA";

    if (shouldDefaultHideCalls) {
      cy.nodes("[type = 'Call'][!promoted], [category = 'Call'][!promoted]").addClass("call-hidden").hide();
      cy.nodes("[type = 'Call'][?promoted], [category = 'Call'][?promoted]").removeClass("call-hidden").show();
    } else {
      cy.nodes("[type = 'Call'], [category = 'Call']").removeClass("call-hidden").show();
    }

    requestAnimationFrame(() => {
      try {
        cy.resize();
      } catch {}
      window.setTimeout(() => {
        try {
          cy.fit({ padding: 60 });
        } catch {}
      }, 150);
    });

    const nextVisibleNodeTypes = new Set(
      nodeTypeList
        .map((x) => x.type)
        .filter((type) => isNodeTypeActuallyVisible(cy, type))
    );

    setVisibleNodeTypes(nextVisibleNodeTypes);
    setVisibleEdgeTypes(new Set(edgeTypeList.map((x) => x.type)));
  };

  const layoutSupported = [
    "HE_2025",
    "Cluster_1",
    "Cluster_2",
    "Cluster_3",
    "Cluster_4",
    "Cluster_5",
    "Cluster_6",
  ].includes(cleanGraphName);

  const nodeTogglesVisible = !!cy && nodeTypeList.length > 0;

  return (
    <Box
      ref={scrollRef}
      className="legend-sidebar legend-filters-panel"
      component="aside"
      sx={{
        width: "100%",
        minWidth: "100%",
        maxWidth: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <Box className="legend-header">
        <Box className="legend-header-left" display="flex" alignItems="center" gap={1}>
          <FilterListIcon className="legend-filter-icon" fontSize="small" />
          <div className="graph-app-logo legend-brand-badge" aria-hidden="true">
            <span className="graph-app-logo-mark graph-app-logo-mask" aria-hidden="true" />
          </div>
        </Box>

        <Box className="legend-header-center">
          <Typography className="legend-header-title" variant="subtitle1" fontWeight="bold">
            Filters &amp; Controls
          </Typography>
        </Box>

        <Box className="legend-header-right">
          {onCollapse && (
            <IconButton
              onClick={onCollapse}
              size="small"
              title="Collapse Legend"
              className="legend-collapse-button"
            >
              <ChevronLeftIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      <Box className="legend-content">
        <LegendSection
          title="Graph Dataset"
          isOpen={sectionsOpen.dataset}
          onToggle={() => toggleSection("dataset")}
        >
          <GraphSelector
            cy={cy}
            graphName={graphName}
            setGraphName={setGraphName}
            loadFromStore={loadFromStore}
            selectedNodeId={selectedNodeId}
            onRequestNavigate={onRequestNavigate}
          />
        </LegendSection>

        {isHE2025 && edgeTypeList.length > 0 && (
          <LegendSection
            title="Edge Types"
            isOpen={sectionsOpen.edgeTypes}
            onToggle={() => toggleSection("edgeTypes")}
          >
            <EdgeTypeToggle
              cy={cy}
              types={edgeTypeList}
              visibleTypes={visibleEdgeTypes}
              onToggle={(type) =>
                toggleType(type, visibleEdgeTypes, setVisibleEdgeTypes, (t) =>
                  cy.edges(`[type = "${t}"], [category = "${t}"]`)
                )
              }
            />
          </LegendSection>
        )}

        {nodeTogglesVisible && (
          <LegendSection
            title="Node Types"
            isOpen={sectionsOpen.nodeTypes}
            onToggle={() => toggleSection("nodeTypes")}
          >
          <NodeTypeToggle
            cy={cy}
            types={nodeTypeList}
            visibleTypes={visibleNodeTypes}
            onToggle={(type) =>
              toggleType(type, visibleNodeTypes, setVisibleNodeTypes, (t) =>
                selectorForType(cy, t)
              )
            }
          />
          </LegendSection>
        )}

        <LegendSection
          title="Search Node"
          isOpen={sectionsOpen.search}
          onToggle={() => toggleSection("search")}
        >
          <SearchBox cy={cy} showTitle={false} />
        </LegendSection>

        {isHE2025 && (
          <LegendSection
            title="Min Similarity"
            isOpen={sectionsOpen.similarity}
            onToggle={() => toggleSection("similarity")}
          >
            <ScoreFilter cy={cy} showTitle={false} />
          </LegendSection>
        )}

        <LegendSection
          title="Layout Mode"
          isOpen={sectionsOpen.layout}
          onToggle={() => toggleSection("layout")}
        >
          <LayoutSwitcher graphName={graphName} setGraphName={setGraphName} />
        </LegendSection>
      </Box>

      <Box className="legend-footer">
        <button type="button" className="legend-reset-button" onClick={resetView}>
          <span className="legend-reset-icon">⟳</span>
          Reset All Filters
        </button>
      </Box>
    </Box>
  );
};

export default LegendToggle;