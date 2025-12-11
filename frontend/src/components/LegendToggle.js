// src/components/LegendToggle.js
import { useState, useEffect, useRef } from "react";
import { useCy } from "./context/CyContext";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import SearchBox from "./LegendParts/SearchBox";
import ScoreFilter from "./LegendParts/ScoreFilter";
import "../styles/main.scss";
import { IconButton } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import GraphSelector from "./LegendParts/GraphSelector";
import LayoutSwitcher from "./LegendParts/LayoutSwitcher";
import EdgeTypeToggle from "./LegendParts/EdgeTypeToggle";
import NodeTypeToggle from "./LegendParts/NodeTypeToggle";

import {
  defaultEdgeTypes,
  defaultNodeTypes,
  getEdgeTypeList,
  getNodeTypeList,
} from "./LegendParts/graphTypeConfig";
import { getClusterConfigForId } from "./NodeDetalParts/useNodeDetail";

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
        {isOpen ? <ExpandLessIcon fontSize="small"  /> : <ExpandMoreIcon fontSize="small" />}
      </IconButton>
    </Box>
    {isOpen && <Box className="legend-section-body">{children}</Box>}
  </Box>
);

const LegendToggle = ({ hoveredNodeRef, graphName, setGraphName, onCollapse }) => {
  const cy = useCy();
  const scrollRef = useRef(null);

  const normalizeGraphName = (name) => name.replace("_cose", "");
  const cleanGraphName = normalizeGraphName(graphName);

  const [visibleEdgeTypes, setVisibleEdgeTypes] = useState(
    defaultEdgeTypes[cleanGraphName] || new Set()
  );
  const [visibleNodeTypes, setVisibleNodeTypes] = useState(
    defaultNodeTypes[cleanGraphName] || new Set()
  );

  const edgeTypeList = getEdgeTypeList(graphName);
  const nodeTypeList = getNodeTypeList(graphName);

  // section open/closed state (all open by default)
  const [sectionsOpen, setSectionsOpen] = useState({
    dataset: true,
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
    const normalized = graphName.replace("_cose", "");
    setVisibleEdgeTypes(defaultEdgeTypes[normalized] || new Set());
    setVisibleNodeTypes(defaultNodeTypes[normalized] || new Set());
  }, [graphName]);

  // LegendToggle.js

  useEffect(() => {
    if (!cy) return;

    const normalized = graphName.replace("_cose", "");

    const syncFromCy = () => {
      // Start from the default for this graph
      const baseDefault = defaultNodeTypes[normalized];
      const next = baseDefault ? new Set(baseDefault) : new Set();

      // If ANY Call node is currently visible, mark "Call" as active
      const visibleCallCount = cy
        .nodes("node[type = 'Call'], node[category = 'Call']")
        .filter(":visible").length;

      if (visibleCallCount > 0) {
        next.add("Call");
      } else {
        next.delete("Call");
      }

      setVisibleNodeTypes(next);
    };

  // Initial sync + whenever visibility changes
  syncFromCy();

  const handler = () => syncFromCy();
  cy.on("add remove style", "node", handler);

  return () => {
    try {
      cy.off("add remove style", "node", handler);
    } catch {
      /* ignore */
    }
  };
}, [cy, graphName]);

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
    if (!cy) return;
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
    if (!cy) return;
    cy.elements().show();
    cy.nodes().removeClass("faded highlighted");
    cy.edges().removeClass("faded");
    cy.nodes().unselect();
    cy.fit();

    const normalized = graphName.replace("_cose", "");
    setVisibleEdgeTypes(new Set([...defaultEdgeTypes[normalized] || []]));
    setVisibleNodeTypes(new Set([...defaultNodeTypes[normalized] || []]));
  };


  const typeTogglesSupported = [
    "HE_2025",
    "Cluster_2",
    "Cluster_3",
    "Cluster_4",
    "Cluster_1",
    "Cluster_5",
    "Cluster_6",
  ].includes(cleanGraphName);

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

        {typeTogglesSupported && (
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
                toggleType(
                  type,
                  visibleEdgeTypes,
                  setVisibleEdgeTypes,
                  (t) => cy.edges(`[type = "${t}"]`)
                )
              }
            />
          </LegendSection>
        )}

        {typeTogglesSupported && (
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
                toggleType(
                  type,
                  visibleNodeTypes,
                  setVisibleNodeTypes,
                  (t) => cy.nodes(`[type = "${t}"]`)
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

        {graphName === "HE_2025" && (
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
        <button
          type="button"
          className="legend-reset-button"
          onClick={resetView}
        >
          <span className="legend-reset-icon">⟳</span>
          Reset All Filters
        </button>
      </Box>
    </Box>
  );
};

export default LegendToggle;
