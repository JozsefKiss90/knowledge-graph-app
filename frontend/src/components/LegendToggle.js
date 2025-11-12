//\src\components\LegendToggle.js

import { useState, useEffect, useRef } from 'react';
import { useCy } from "./context/CyContext";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import SearchBox from './LegendParts/SearchBox';
import ScoreFilter from './LegendParts/ScoreFilter';
import '../styles/main.scss'
import ArrowCircleLeftIcon from '@mui/icons-material/ArrowCircleLeft';
import { IconButton } from '@mui/material';
import GraphSelector from "./LegendParts/GraphSelector";
import LayoutSwitcher from "./LegendParts/LayoutSwitcher";
import TypeToggles from "./LegendParts/TypeToggles";
import HoveredNodeInfo from "./LegendParts/HoveredNodeInfo";
import {
  defaultEdgeTypes,
  defaultNodeTypes,
  getEdgeTypeList,
  getNodeTypeList
} from "./LegendParts/graphTypeConfig";

const LegendToggle = ({ hoveredNodeRef, graphName, setGraphName, onCollapse }) => {
  const cy = useCy();
  const [hoveredNode, setHoveredNode] = useState(null);
  const scrollRef = useRef(null);

  const normalizeGraphName = (name) => name.replace('_cose', '');
  const cleanGraphName = normalizeGraphName(graphName);

  const [visibleEdgeTypes, setVisibleEdgeTypes] = useState(
    defaultEdgeTypes[cleanGraphName] || new Set()
  );
  const [visibleNodeTypes, setVisibleNodeTypes] = useState(
    defaultNodeTypes[cleanGraphName] || new Set()
  );

  const edgeTypeList = getEdgeTypeList(graphName);
  const nodeTypeList = getNodeTypeList(graphName);

  useEffect(() => {
    const normalized = graphName.replace('_cose', '');
    setVisibleEdgeTypes(defaultEdgeTypes[normalized] || new Set());
    setVisibleNodeTypes(defaultNodeTypes[normalized] || new Set());
  }, [graphName]);

  useEffect(() => {
    let lastHoveredId = null;

    const interval = setInterval(() => {
      const currentNode = hoveredNodeRef.current;

    if (currentNode?.id && currentNode?.id !== lastHoveredId) {
      setHoveredNode(currentNode);
      lastHoveredId = currentNode.id;
    }

    }, 100);

    return () => clearInterval(interval);
  }, [hoveredNodeRef]);

  useEffect(() => {
    const normalized = graphName.replace('_cose', '');
    setVisibleEdgeTypes(defaultEdgeTypes[normalized] || new Set());
    setVisibleNodeTypes(defaultNodeTypes[normalized] || new Set());
  }, [graphName]);

  useEffect(() => {
  const handleWheel = (e) => {
    if (hoveredNodeRef.current && scrollRef.current) {
      scrollRef.current.scrollTop += e.deltaY;
      e.preventDefault();
        }
      };
      window.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        window.removeEventListener('wheel', handleWheel);
      };
    }, []);


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
    cy.nodes().removeClass('faded highlighted');
    cy.edges().removeClass('faded');
    cy.nodes().unselect();
    cy.fit();
    const normalized = graphName.replace('_cose', '');
    setVisibleEdgeTypes(new Set([...defaultEdgeTypes[normalized] || []]));
    setVisibleNodeTypes(new Set([...defaultNodeTypes[normalized] || []]));
    setHoveredNode(null)
  };

  return (
  
    <Box
      ref={scrollRef}
      className="legend-sidebar"
      component="aside"
      sx={{
        width: 400,
        height: '100vh',
        p: 3,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 3
      }}
    >
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography
            className="legend-titles"
            variant="subtitle1"
            fontWeight="bold"
            sx={{ mb: 0 }}
          >
            Graph Filter
          </Typography>
          <IconButton
            onClick={onCollapse}
            size="small"
            title="Collapse Legend"
            sx={{ p: 0, ml: 1 }}
          >
            <ArrowCircleLeftIcon sx={{ color: 'white', fontSize: 28 }} />
          </IconButton>
        </Box>
          <Box display="flex" gap={1} flexWrap="wrap" sx={{mt: 1}}>
              <GraphSelector graphName={graphName} setGraphName={setGraphName} />
          </Box>
      </Box>
      {["HE_2025","Cluster_2", "Cluster_3", "Cluster_4","Cluster_5"].includes(cleanGraphName) && (
        <LayoutSwitcher graphName={graphName} setGraphName={setGraphName} />
      )}
      <TypeToggles
        cy={cy}
        graphName={graphName}
        edgeTypes={edgeTypeList}
        nodeTypes={nodeTypeList}
        visibleEdgeTypes={visibleEdgeTypes}
        visibleNodeTypes={visibleNodeTypes}
        toggleEdgeType={(type) =>
          toggleType(type, visibleEdgeTypes, setVisibleEdgeTypes, (t) => cy.edges(`[type = "${t}"]`))
        }
        toggleNodeType={(type) =>
          toggleType(type, visibleNodeTypes, setVisibleNodeTypes, (t) => cy.nodes(`[type = "${t}"]`))
        }
      />

      <SearchBox cy={cy} />

      {graphName === "HE_2025" && (
        <ScoreFilter cy={cy} />
      )}
      {onCollapse && (
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <button
            className="btn btn-sm btn-outline-secondary components legend-titles"
            onClick={resetView}
          >
            Reset View
          </button>
        </Box>
      )}
    <HoveredNodeInfo node={hoveredNode} graphName={graphName} />
    </Box>
  );
};

export default LegendToggle;