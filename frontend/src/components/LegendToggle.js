// --- LegendToggle.js (refactored with MUI and modular components) ---

import React, { useState, useEffect, useRef } from 'react';
import { useCy } from "./context/CyContext";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import NodeTypeToggle from './LegendParts/NodeTypeToggle';
import EdgeTypeToggle from './LegendParts/EdgeTypeToggle';
import SearchBox from './LegendParts/SearchBox';
import ScoreFilter from './LegendParts/ScoreFilter';
import '../styles/main.scss'
import { useDarkMode } from "./context/DarkModeContext";
import ArrowCircleLeftIcon from '@mui/icons-material/ArrowCircleLeft';
import { IconButton } from '@mui/material';

const Legend = ({ hoveredNodeRef, graphName, setGraphName, onCollapse }) => {
  const cy = useCy();
  const [hoveredNode, setHoveredNode] = useState(null);
  const scrollRef = useRef(null);
  const summaryRef = useRef();
  const { darkMode } = useDarkMode();

  const defaultEdgeTypes = {
    HE_2025: new Set(['BELONGS_TO_TOPIC', 'SHARED_TOPIC', 'CROSS_TOPIC_SIMILARITY']),
    Cluster_4: new Set(['HAS_DESTINATION', 'HAS_THEME', 'HAS_CALL']),
    Cluster_2: new Set(['HAS_DESTINATION', 'HAS_THEME', 'HAS_CALL'])
  };

  const defaultNodeTypes = {
    HE_2025: new Set(['policy', 'strategy', 'cluster', 'research_theme', 'institution', 'topic']),
    Cluster_4: new Set(['Work Programme', 'Destination', 'Theme', 'Call']),
    Cluster_2: new Set(['Work Programme', 'Destination', 'Theme', 'Call'])
  };

  const normalizeGraphName = (name) => name.replace('_cose', '');
  const cleanGraphName = normalizeGraphName(graphName);

  const [visibleEdgeTypes, setVisibleEdgeTypes] = useState(
    defaultEdgeTypes[cleanGraphName] || new Set()
  );
  const [visibleNodeTypes, setVisibleNodeTypes] = useState(
    defaultNodeTypes[cleanGraphName] || new Set()
  );

  useEffect(() => {
    const normalized = graphName.replace('_cose', '');
    setVisibleEdgeTypes(defaultEdgeTypes[normalized] || new Set());
    setVisibleNodeTypes(defaultNodeTypes[normalized] || new Set());
  }, [graphName]);

  const edgeTypeList = graphName === 'HE_2025'
  ? [
      { type: 'BELONGS_TO_TOPIC', color: 'rgb(0, 175, 140)' },     // green → cooler teal green
      { type: 'SHARED_TOPIC', color: 'rgb(70, 149, 252)' },        // blue → icy blue
      { type: 'CROSS_TOPIC_SIMILARITY', color: 'rgb(223, 182, 70)' } // orange → muted bronze (less warmth)
    ] 
  : graphName === 'Cluster_2'
  ? [
      { type: 'HAS_DESTINATION', color: 'rgb(92, 160, 250)' },    // sky blue
      { type: 'HAS_THEME', color: 'rgb(92, 123, 224)' },          // blue-violet
      { type: 'HAS_CALL', color: 'rgb(221, 181, 102)' }            // cool sand
    ]
  : [
      { type: 'HAS_DESTINATION', color: 'rgb(96, 163, 250)' },
      { type: 'HAS_THEME', color: 'rgb(87, 115, 209)' },
      { type: 'HAS_CALL', color: 'rgb(223, 180, 93)' }
    ];

const nodeTypeList = graphName === 'HE_2025'
  ? [
      { type: 'policy', color: 'rgb(1, 173, 196)' },         // teal → cooler, ocean teal
      { type: 'strategy', color: 'rgb(64, 180, 116)' },      // green → pine
      { type: 'cluster', color: 'rgb(197, 91, 67)' },      // orange → desaturated clay
      { type: 'research_theme', color: 'rgb(180, 143, 47)' }, // yellow-orange → muted beige
      { type: 'institution', color: 'rgb(118, 46, 160)' },   // purple → colder violet
      { type: 'topic', color: 'rgb(182, 182, 47)' }         // yellow → desaturated olive
    ]
  : graphName === 'Cluster_2'
  ? [
      { type: 'Work Programme', color: 'rgb(197, 92, 69)' },
      { type: 'Destination', color: 'rgb(120, 175, 235)' },
      { type: 'Theme', color: 'rgb(88, 117, 212)' },
      { type: 'Call', color: 'rgb(214, 176, 99)' }
    ]
  : [
      { type: 'Work Programme', color: 'rgb(196, 96, 74)' },
      { type: 'Destination', color: 'rgb(98, 170, 247)' },
      { type: 'Theme', color: 'rgb(86, 119, 226)' },
      { type: 'Call', color: 'rgb(223, 180, 94)' }
    ];

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
      // prevent page scroll
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
    setVisibleEdgeTypes(new Set(['BELONGS_TO_TOPIC', 'SHARED_TOPIC', 'CROSS_TOPIC_SIMILARITY']));
    setVisibleNodeTypes(new Set(['policy', 'strategy', 'cluster', 'research_theme', 'institution', 'topic']));
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
              <select
                className="graph-filter"
                value={graphName.replace('_cose', '')}
                onChange={(e) => {
                  const selected = e.target.value;
                  const useCoseLayout = ['Cluster_2', 'Cluster_4'].includes(selected);
                  const updatedGraphName = useCoseLayout ? `${selected}_cose` : selected;
                  setGraphName(updatedGraphName);
                }}
              >
              <option value="HE_2025">Horizon Europe strategic plan (2025 – 2027)</option>
              <option value="Cluster_2">Horizon Europe - Work Programme 2025 Culture, Creativity and Inclusive Society</option>
              <option value="Cluster_4">Horizon Europe - Work Programme 2025 Digital, Industry and Space</option>
            </select>
          </Box>
      </Box>
      {["Cluster_2", "Cluster_4"].includes(cleanGraphName) && (
        <Box>
          <Typography className="legend-titles" variant="subtitle1" fontWeight="bold">
            Layout Mode
          </Typography>
              <Box sx={{ mt: 1, ml: 1 }}>
                <RadioGroup
                  value={graphName.endsWith('_cose') ? 'cose' : 'klay'}
                  onChange={(e) => {
                    const selectedLayout = e.target.value;
                    setGraphName(prev =>
                      selectedLayout === 'klay'
                        ? prev.replace('_cose', '')
                        : prev.endsWith('_cose') ? prev : prev + '_cose'
                    );
                  }}
                >
            <FormControlLabel
              value="cose"
              control={<Radio sx={{ color: 'white' }} />}
              label="Default"
              sx={{ color: 'white' }}
            />
            <FormControlLabel
              value="klay"
              control={<Radio sx={{ color: 'white' }} />}
              label="Tree"
              sx={{ color: 'white' }}
            />
            </RadioGroup>
          </Box>
        </Box>
      )}

      {["HE_2025", "Cluster_4", "Cluster_2"].includes(cleanGraphName) && (
        <EdgeTypeToggle
          cy={cy}
          types={edgeTypeList}
          visibleTypes={visibleEdgeTypes}
          onToggle={(type) => toggleType(type, visibleEdgeTypes, setVisibleEdgeTypes, t => cy.edges(`[type = "${t}"]`))}
        />
      )}
      {["HE_2025", "Cluster_4", "Cluster_2"].includes(cleanGraphName) && (
        <NodeTypeToggle
          cy={cy}
          types={nodeTypeList}
          visibleTypes={visibleNodeTypes}
          onToggle={(type) => toggleType(type, visibleNodeTypes, setVisibleNodeTypes, t => cy.nodes(`[type = "${t}"]`))}
        />
      )}
    
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
   {hoveredNode && (
    <Box className="mt-3 mb-5 p-2 border rounded shadow-sm hovered-node ">
      <Typography className="legend-titles" variant="subtitle1" fontWeight="bold">Hovered Node</Typography>
      <Typography className="legend-titles" variant="body2"><strong>Label:</strong> {hoveredNode.label}</Typography>
      <Typography className="legend-titles" variant="body2"><strong>Type:</strong> {hoveredNode.type}</Typography>

      {hoveredNode.summary && (
        <Typography className="legend-titles" variant="body2" sx={{ color: "white", mt: 1 }}>
          <strong>Summary:</strong><br />{hoveredNode.summary}
        </Typography>
      )}

      {["Cluster_2", "Cluster_4"].includes(cleanGraphName) && (
        <>
          {["call_id", "call_type", "call_section", "expected_eu_contribution", "indicative_budget"].map(key => (
            hoveredNode[key] && (
              <Typography key={key} className="legend-titles" variant="body2">
                <strong>{formatLabel(key)}:</strong> {hoveredNode[key]}
              </Typography>
            )
          ))}
        </>
      )}
    </Box>
  )}

    </Box>
  );
};

function formatLabel(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default Legend;