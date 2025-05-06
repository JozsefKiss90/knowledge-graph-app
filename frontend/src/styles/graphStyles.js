// --- Final polished graphStyles.js ---

const cyStyle = [
  // Base node style
  {
    selector: 'node',
    style: {
      'background-color': '#2196f3',
      'label': 'data(displayLabel)', 
      'width': '33px',
      'height': '33px',
      'font-size': '12px',
      'text-wrap': 'wrap',
      'text-max-width': '40px', 
      'text-outline-width': 0.5,
      'text-valign': 'center',
      'text-halign': 'center',
      'color': 'white',
      'text-outline-color': 'white',
      'padding': '10px'
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
      'background-color': '#00bcd4'
    },
  },
  {
    selector: "node[type = 'strategy']",
    style: {
      'background-color': '#4caf50'
    },
  },
  {
    selector: "node[type = 'cluster']",
    style: {
      'background-color': '#ff7043'
    },
  },
  {
    selector: "node[type = 'research_theme']",
    style: {
      'background-color': '#ffb300'
    },
  },
  {
    selector: "node[type = 'institution']",
    style: {
      'background-color': '#9c27b0'
    },
  },
  {
    selector: "node[type = 'topic']",
    style: {
      'background-color': 'rgba(51, 80, 245, 0.8)',
      'width': '40px',
      'height': '40px',
      'font-size': '12px'
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
];

export default cyStyle;

// --- End of final graphStyles.js ---
