// --- Final polished graphStyles.js ---

const cyStyle = [
  // Base node style
  {
    selector: 'node',
    style: {
      'background-color': '#2196f3',
      'label': 'data(displayLabel)', 
      'width': '35px',
      'height': '35px',
      'font-size': '13px',
      'text-wrap': 'wrap',
      'text-max-width': '40px', 
      'text-outline-width': 0.5,
      'text-valign': 'center',
      'text-halign': 'center',
      'color': 'white',
      'text-outline-color': 'white',
      'padding': '11px'
    },
  },

  {
    selector: '.faded',
    style: {
      'opacity': 0.1,
      'text-opacity': 0.1
    }
  },
  {
    selector: '.highlighted',
    style: {
      'border-color': '#ffeb3b',
      'border-width': 2,
      'opacity': 1,
      'text-opacity': 1
    }
  },
    
  {
    selector: "node[type = 'policy']",
    style: {
      'background-color': 'rgb(1, 173, 196)'
    },
  },
  {
    selector: "node[type = 'strategy']",
    style: {
      'background-color': 'rgb(64, 180, 116)'
    },
  },
  {
    selector: "node[type = 'cluster']",
    style: {
      'background-color': 'rgb(197, 91, 67)'
    },
  },
  {
    selector: "node[type = 'research_theme']",
    style: {
      'background-color': 'rgb(180, 143, 47)'
    },
  },
  {
    selector: "node[type = 'institution']",
    style: {
      'background-color': 'rgb(118, 46, 160)'
    },
  },
  {
    selector: "node[type = 'topic']",
    style: {
      'background-color': 'rgb(182, 182, 47)',
      'width': '42px',
      'height': '42px',
      'font-size': '14px'
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 1.5,
      'line-color': '#cccccc',
      'target-arrow-color': '#cccccc',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 0.5,
    },
  },
  {
    selector: 'edge[type = "BELONGS_TO_TOPIC"]',
    style: {
      'line-color': 'rgb(0, 219, 117)',
      'target-arrow-color': 'rgb(0, 219, 117)',
      'line-style': 'solid',
      'width': 1.7,
    },
  },
  {
    selector: 'edge[type = "SHARED_TOPIC"]',
    style: {
      'line-color': '#2196f3',
      'target-arrow-color': '#2196f3',
      'line-style': 'dashed',
      'width': 1,
    },
  },
  {
    selector: 'edge[type = "CROSS_TOPIC_SIMILARITY"]',
    style: {
      'line-color': '#fb8c00',
      'target-arrow-color': '#fb8c00',
      'line-style': 'dotted',
      'width': '0.8', 
      'label': 'data(score)',   
      'font-size': 5,
      'color': '#fb8c00',
      'text-background-color': 'rgba(64, 64, 64, 1)',
      'text-background-opacity': 1,
      'text-background-padding': 1,
      'text-margin-y': -5,
      'text-rotation': 'autorotate',
    },
  },
  
  {
    selector: 'edge[type = "BELONGS_TO_CLUSTER"]',
    style: {
      'line-color': '#9c27b0',
      'target-arrow-color': '#9c27b0',
      'line-style': 'solid',
      'width': 2,
    },
  },
  {
    selector: "node[type = 'Work Programme']",
    style: {
      'background-color': 'pink',
      'width': '70px',
      'height': '70px',
      'padding': "15px",
      "font-size": "20px"
    },
  },
  {
  selector: "node[type = 'Destination']",
  style: {
    'background-color': '#64b5f6',
    'width': '60px',
    'height': '60px',
    'padding': "10px",
    "font-size": "16px"
  },
},
{
  selector: "node[type = 'Theme']",
  style: {
    'background-color': '#7986cb',
    'width': '54px',
    'height': '54px',
    'padding': "30px",
    'padding': "7px",
    "font-size": "14px"
  },
},
{
  selector: "node[type = 'Call']",
  style: {
    'background-color': '#ffb74d',
    'width': '32px',
    'height': '32px',
  },
},
{
  selector: 'edge[type = "HAS_DESTINATION"]',
  style: {
    'line-color': '#42a5f5',
    'target-arrow-color': '#42a5f5',
    'line-style': 'solid',
    'width': 2,
  },
},
{
  selector: 'edge[type = "HAS_THEME"]',
  style: {
    'line-color': '#7986cb',
    'target-arrow-color': '#7986cb',
    'line-style': 'dashed',
    'width': 1.5,
  },
},
{
  selector: 'edge[type = "HAS_CALL"]',
  style: {
    'line-color': '#ffb74d',
    'target-arrow-color': '#ffb74d',
    'line-style': 'solid',
    'width': 1.3,
  },
},

];

export default cyStyle;

// --- End of final graphStyles.js ---
