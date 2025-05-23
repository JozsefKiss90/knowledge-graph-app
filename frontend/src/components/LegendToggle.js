// --- LegendToggle.js (refactored with MUI and modular components) ---

import React, { useState, useEffect } from 'react';
import { useCy } from "./context/CyContext";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import NodeTypeToggle from './LegendParts/NodeTypeToggle';
import EdgeTypeToggle from './LegendParts/EdgeTypeToggle';
import SearchBox from './LegendParts/SearchBox';
import ScoreFilter from './LegendParts/ScoreFilter';
import '../styles/main.scss'

const Legend = ({ hoveredNodeRef, graphName, setGraphName }) =>  {
  const cy = useCy();
  const [hoveredNode, setHoveredNode] = useState(null);
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
    const interval = setInterval(() => {
      setHoveredNode(hoveredNodeRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [hoveredNodeRef]);

useEffect(() => {
  const normalized = graphName.replace('_cose', '');
  setVisibleEdgeTypes(defaultEdgeTypes[normalized] || new Set());
  setVisibleNodeTypes(defaultNodeTypes[normalized] || new Set());
}, [graphName]);


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
  };

  return (
    <Box
      className="components"
      component="aside"
      sx={{
        width: 400,
        height: '100vh',
        p: 3,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        '&::-webkit-scrollbar': {
          width: '8px',
          paddingTop: '100px'
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'rgb(20, 43, 59)',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgb(26, 80, 102)',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          backgroundColor: '#555',
        },
      }}
    >
      <Box>
        <Typography  sx={{color:'white'}} variant="subtitle1" fontWeight="bold">Graph Filter</Typography>
          <Box display="flex" gap={1} flexWrap="wrap" sx={{mt: 1}}>
            <select
                className="graph-filter"
                value={graphName}
                onChange={(e) => {
                const selected = e.target.value;
                if (selected !== graphName) {
                  // Only update if truly changed
                  setGraphName(selected);
                }
              }}
              >
              <option value="HE_2025">Horizon Europe strategic plan (2025 – 2027)</option>
              <option value="Cluster_2">Horizon Europe - Work Programme 2025 Culture, Creativity and Inclusive Society</option>
              <option value="Cluster_4">Horizon Europe - Work Programme 2025 Digital, Industry and Space</option>
            </select>
          </Box>
      </Box>
{["Cluster_2", "Cluster_4"].includes(cleanGraphName) && (
  <Box sx={{ mt: 2 }}>
    <Typography sx={{ color: 'white' }} variant="subtitle1" fontWeight="bold">
      Layout Mode
    </Typography>
    <Box sx={{ mt: 1, ml: 1 }}>
      <FormControlLabel
        control={
          <Checkbox
            checked={!graphName.endsWith('_cose')}
            onChange={() => {
              setGraphName(prev =>
                prev.endsWith('_cose') ? prev.replace('_cose', '') : prev
              );
            }}
            sx={{ color: 'white' }}
          />
        }
        label="Default (Klay)"
        sx={{ color: 'white' }}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={graphName.endsWith('_cose')}
            onChange={() => {
              setGraphName(prev =>
                prev.endsWith('_cose') ? prev : prev + '_cose'
              );
            }}
            sx={{ color: 'white' }}
          />
        }
        label="Cose-Bilkent"
        sx={{ color: 'white' }}
      />
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

      <Box>
        <button style={{color:'white'}}  className="btn btn-sm btn-outline-secondary components" onClick={resetView}>Reset View</button>
      </Box>

      {hoveredNode && (
        <Box className="mt-3 mb-5 p-2 border rounded shadow-sm " sx={{backgroundColor: "rgb(43, 56, 65)"}}>
          <Typography sx={{color:"white"}} variant="subtitle1" fontWeight="bold">Hovered Node</Typography>
          <Typography  sx={{color:"white"}} variant="body2"><strong>Label:</strong> {hoveredNode.label}</Typography>
          <Typography  sx={{color:"white"}} variant="body2"><strong>Type:</strong> {hoveredNode.type}</Typography>
          {hoveredNode.summary && (
            <Typography  variant="body2" sx={{color:"white", mt: 1 }}>
              <strong>Summary:</strong><br />{hoveredNode.summary}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Legend;