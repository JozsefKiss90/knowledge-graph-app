// src/components/LegendToggle.js
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
  <Box className="legend-section">
    <Box className="legend-section-header" onClick={onToggle}>
      <Typography className="legend-section-title" variant="subtitle2">
        {title}
      </Typography>
      <IconButton
        size="small"
        className="legend-section-toggle"
        aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
      >
        {isOpen ? (
          <ExpandLessIcon fontSize="small" />
        ) : (
          <ExpandMoreIcon fontSize="small" />
        )}
      </IconButton>
    </Box>
    {isOpen && <Box className="legend-section-body">{children}</Box>}
  </Box>
);

const normalizeGraphName = (name) => String(name || "").replace("_cose", "");

function collectLayerNodeTypes(cy) {
  if (!cy || cy.destroyed()) return [];

  const typeToColorCounts = new Map(); // type -> Map(color -> count)

  cy.nodes().forEach((n) => {
    const t = n.data("type") || n.data("category");
    if (!t) return;
    let key = String(t);

// Remap 'root' nodes to the effective type for this layer so button colors stay congruent.
// GraphView assigns role classes (as-root / as-cluster-root / as-destination-root).
if (key.toLowerCase() === "root") {
  try {
    if (n.hasClass && n.hasClass("as-cluster-root")) key = "cluster";
    else if (n.hasClass && n.hasClass("as-destination-root")) key = "Destination";
  } catch {}
}


    let color;
    try { color = n.style("background-color"); } catch { color = undefined; }
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
      if (count > bestCount) { bestCount = count; bestColor = c; }
    }
    out.push({
      type,
      label: String(type).toLowerCase() === "root" ? "Horizon Europe" : String(type),
      color: bestColor,
    });
  }
  return out;
}



// Collect edge types in the CURRENT Cytoscape layer (used only for HE_2025)
function collectLayerEdgeTypes(cy) {
  if (!cy || cy.destroyed()) return new Set();
  const s = new Set();
  cy.edges().forEach((e) => {
    const t = e.data("type") || e.data("category");
    if (t) s.add(t);
  });
  return s;
}

const LegendToggle = ({ hoveredNodeRef, graphName, setGraphName, onCollapse }) => {
  const cy = useCy();
  const scrollRef = useRef(null);

  const cleanGraphName = normalizeGraphName(graphName);
  const isHE2025 = cleanGraphName === "HE_2025";

  // Node/edge types present in the current layer
  const layerNodeTypes = useMemo(() => collectLayerNodeTypes(cy), [cy, graphName]);
  const layerEdgeTypesSet = useMemo(() => collectLayerEdgeTypes(cy), [cy, graphName]);

  // Keep HE_2025 ordering/colors from config, but only show types that are present
const nodeTypeList = useMemo(() => {
  const present = new Map(layerNodeTypes.map((x) => [x.type, x]));

  if (isHE2025) {
    const configured = getNodeTypeList("HE_2025");
    return configured
      .filter((x) => present.has(x.type))
      .map((x) => ({
        ...present.get(x.type),
        ...x, // configured color wins for HE_2025
      }));
  }

  return layerNodeTypes;
}, [isHE2025, layerNodeTypes]);

  const edgeTypeList = useMemo(() => {
    if (!isHE2025) return [];
    const configured = getEdgeTypeList("HE_2025");
    return configured.filter((x) => layerEdgeTypesSet.has(x.type));
  }, [isHE2025, layerEdgeTypesSet]);

  // Visible sets – default to all types in the current layer (resets on layer change)
  const [visibleNodeTypes, setVisibleNodeTypes] = useState(new Set());
  const [visibleEdgeTypes, setVisibleEdgeTypes] = useState(new Set());

  useEffect(() => {
    setVisibleNodeTypes(new Set(nodeTypeList.map((x) => x.type)));
  }, [cy, graphName, nodeTypeList]);

  useEffect(() => {
    setVisibleEdgeTypes(new Set(edgeTypeList.map((x) => x.type)));
  }, [cy, graphName, edgeTypeList]);

  // section open/closed state (all open by default)
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

  // keep wheel scrolling smooth when hover-pane consumes wheel events
  useEffect(() => {
    const handleWheel = (e) => {
      if (hoveredNodeRef.current && scrollRef.current) {
        scrollRef.current.scrollTop += e.deltaY;
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [hoveredNodeRef]);

  const toggleType = (type, typeSet, setter, selectorFn) => {
    if (!cy || cy.destroyed()) return;

    const newSet = new Set(typeSet);
    const elements = selectorFn(type);

    if (newSet.has(type)) {
      newSet.delete(type);
      elements.hide();
    } else {
      newSet.add(type);
      elements.show();
    }

    setter(newSet);
  };

  const resetView = () => {
    if (!cy || cy.destroyed()) return;

    cy.elements().show();
    cy.nodes().removeClass("faded highlighted is-hovered");
    cy.edges().removeClass("faded highlighted");
    cy.nodes().unselect();
    cy.fit({ padding: 60 });

    // Reset to “all types in this layer”
    setVisibleNodeTypes(new Set(nodeTypeList.map((x) => x.type)));
    setVisibleEdgeTypes(new Set(edgeTypeList.map((x) => x.type)));
  };

  // Keep LayoutSwitcher behaviour as-is (graphName suffix based)
  const layoutSupported = ["HE_2025", "Cluster_1", "Cluster_2", "Cluster_3", "Cluster_4", "Cluster_5", "Cluster_6"].includes(
    cleanGraphName
  );

  // Show Node Types on ALL layers where there is at least one toggleable type
  const nodeTogglesVisible = !!cy && nodeTypeList.length > 0;

  return (
    <Box
      ref={scrollRef}
      className="legend-sidebar legend-filters-panel"
      component="aside"
      sx={{
        width: 400,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header: Filters & Controls + collapse */}
      <Box className="legend-header">
        <Box display="flex" alignItems="center" gap={1}>
          <FilterListIcon fontSize="small" />
          <Typography variant="subtitle1" fontWeight="bold">
            Filters &amp; Controls
          </Typography>
        </Box>
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

      {/* Scrollable content */}
      <Box className="legend-content">
        <LegendSection
          title="Graph Dataset"
          isOpen={sectionsOpen.dataset}
          onToggle={() => toggleSection("dataset")}
        >
          <GraphSelector graphName={graphName} setGraphName={setGraphName} />
        </LegendSection>

        {layoutSupported && (
          <LegendSection
            title="Layout Mode"
            isOpen={sectionsOpen.layout}
            onToggle={() => toggleSection("layout")}
          >
            <LayoutSwitcher graphName={graphName} setGraphName={setGraphName} />
          </LegendSection>
        )}

        {/* Edge Types only relevant for HE_2025 */}
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
                  cy.nodes(`[type = "${t}"], [category = "${t}"]`)
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

        {/* Similarity section only for HE_2025 */}
        {isHE2025 && (
          <LegendSection
            title="Min Similarity"
            isOpen={sectionsOpen.similarity}
            onToggle={() => toggleSection("similarity")}
          >
            <ScoreFilter cy={cy} showTitle={false} />
          </LegendSection>
        )}
      </Box>

      {/* Fixed footer / Reset button */}
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
