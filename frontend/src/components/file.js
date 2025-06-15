import  { useEffect, useRef, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import GraphView from "./GraphView";
import Legend from "./LegendToggle";
import { CyContext } from "./context/CyContext";
import { IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import { useDarkMode } from './context/DarkModeContext';
import { useLocation } from "react-router-dom";
import Slider from "@mui/material/Slider";
import Button from "@mui/material/Button";
import ArrowCircleRightIcon from '@mui/icons-material/ArrowCircleRight';
import '../styles/main.scss';
import CustomDrawer from "./LegendParts/CustomDrawer";
import { styled } from '@mui/material/styles';
import EmailIcon from '@mui/icons-material/Email';
import MessageDrawer from "./LegendParts/MessageDrawer"; // ← You'll create this component

function GraphPage() {
  
  const [graphName, setGraphName] = useState(() => localStorage.getItem("graphName") || "HE_2025");
  const [messageDrawerOpen, setMessageDrawerOpen] = useState(false);  
  const graphDataRef = useRef(null);
  const rawGraphDataRef = useRef(null);
  const [cyInstance, setCyInstance] = useState(null); 
  const [ready, setReady] = useState(false);
  const hoveredNodeRef = useRef(null);
  const hoveredNodeIdRef = useRef(null);
  const { darkMode, setDarkMode } = useDarkMode();
  const API_BASE = process.env.REACT_APP_API_URL;
  const location = useLocation();
  const graphViewRef = useRef();
  const [isMessageDrawerOpen, setIsMessageDrawerOpen] = useState(false);

  const handleGraphNameChange = (name) => {
    localStorage.setItem("graphName", name);
    setGraphName(name);
  };

  useEffect(() => {
    const savedGraphName = localStorage.getItem("graphName");
    if (savedGraphName && savedGraphName !== graphName) {
      setGraphName(savedGraphName);
    }
  }, []);

  const fetchGraph = async () => {
    try {
      const baseName = graphName.replace('_cose', ''); 

      let nodesUrl, relsUrl;
      let rawNodes = [];

      if (baseName === "HE_2025") {
        nodesUrl = `${API_BASE}/nodes/`;
        relsUrl = `${API_BASE}/relationships/`;
        const rawRes = await fetch(`${API_BASE}/nodes/raw_nodes/`);
        const rawJson = await rawRes.json();
        rawNodes = rawJson?.nodes || [];
              console.log(nodesUrl)
      console.log(relsUrl)
      } else if (baseName === "Cluster_4") {
        nodesUrl = `${API_BASE}/cluster4/nodes`;
        relsUrl = `${API_BASE}/cluster4/relationships`;
      } else if (baseName === "Cluster_2") {
        nodesUrl = `${API_BASE}/cluster2/nodes`;
        relsUrl = `${API_BASE}/cluster2/relationships`;
      }
      
      const [nodesRes, relsRes] = await Promise.all([
        fetch(nodesUrl),
        fetch(relsUrl)
      ]);
      
      console.log(`${API_BASE}/nodes/raw_nodes/`)
     // console.log(nodesUrl)
      //console.log(relsUrl)
      const nodes = await nodesRes.json();
      const rels = await relsRes.json();

      graphDataRef.current = { nodes, rels };
      rawGraphDataRef.current = { nodes: { nodes: rawNodes } };
      console.log(graphDataRef.current)
      setReady(true);
    } catch (e) {
      console.error("Failed to preload graph data", e);
    }
  };

  useEffect(() => {
    graphDataRef.current = null;
    rawGraphDataRef.current = null;
    setReady(false);  // ✅ ensure reset before fetch
    fetchGraph();
  }, [graphName]);

  const graphRef = useRef();

  const [layoutOptions, setLayoutOptions] = useState({
    name: "cose-bilkent",
    nodeRepulsion: 10000,
    idealEdgeLength: 140,
    edgeElasticity: 0.1,
    fit: false,
    animate: false,
    numIter: 12500
  });

  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleApplyLayout = () => {
    if (graphRef.current) {
      graphRef.current.rerunLayout();
    }
  };

    const PrettoSlider = styled(Slider)({
      color: 'rgb(0, 151, 189)',
      height: 8,
      '& .MuiSlider-track': {
        border: 'none',
      },
      '& .MuiSlider-thumb': {
        height: 24,
        width: 24,
        backgroundColor: '#fff',
        border: '2px solid currentColor',
        '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
          boxShadow: 'inherit',
        },
        '&::before': {
          display: 'none',
        },
      },
      '& .MuiSlider-valueLabel': {
        lineHeight: 1.2,
        fontSize: 12,
        background: 'unset',
        padding: 0,
        width: 32,
        height: 32,
        borderRadius: '50% 50% 50% 0',
        backgroundColor: 'rgb(0, 159, 199)',
        transformOrigin: 'bottom left',
        transform: 'translate(50%, -100%) rotate(-45deg) scale(0)',
        '&::before': { display: 'none' },
        '&.MuiSlider-valueLabelOpen': {
          transform: 'translate(50%, -100%) rotate(-45deg) scale(1)',
        },
        '& > *': {
          transform: 'rotate(45deg)',
        },
      },
    });

  return (
    <CyContext.Provider value={cyInstance}>
      <Container
        fluid
        className={`vh-100 d-flex flex-column p-0 overflow-hidden graph-container`}
      >
        <Row
          className="flex-grow-1 w-100 g-0 legend-titles"
          style={{ flexWrap: "nowrap" }}
        >
          <Col
            xs="auto"
            className="p-0"
            style={{ width: 400, maxWidth: 400, flex: "0 0 400px" }}
          >
            {cyInstance ? (
            <Legend
              hoveredNodeRef={hoveredNodeRef}
              graphName={graphName}
              setGraphName={handleGraphNameChange}
            />
            ) : (
              <div>Loading legend...</div>
            )}
          </Col>

          <Col className="d-flex flex-column p-0 overflow-hidden">
            {ready ? (
              <GraphView
                layoutOptions={layoutOptions}
                graphref={graphRef}
                graphData={graphDataRef.current}
                rawGraphData={rawGraphDataRef.current}
                onCyReady={(cy) => setCyInstance(cy)}
                onNodeHover={(node) => {
                  hoveredNodeRef.current = node;
                }}
                hoveredNodeIdRef={hoveredNodeIdRef}
                onHoverNodeIdChange={(id) => { hoveredNodeIdRef.current = id; }}
                graphName={graphName}
              />
            ) : (
              <div className="text-center p-5">Loading graph...</div>
            )}
          </Col>
          <Col
            xs="auto"
            className="p-0 legend-sidebar"
            style={{
              width: 60,
              maxWidth: 60,
              flex: "0 0 60px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
              zIndex: 10
            }}
          >
            <div className="flex justify-items-center">
              <IconButton className="icon-button" size="large"><InfoOutlinedIcon fontSize="large" /></IconButton>
              <IconButton
                className="icon-button"
                size="large"
                onClick={() => setDarkMode(prev => !prev)}
              >
                <Brightness4Icon  fontSize="large"/>
              </IconButton>

              <IconButton className="icon-button" size="large"><BarChartIcon fontSize="large" /></IconButton>
              <IconButton className="icon-button" size="large" onClick={() => setDrawerOpen(true)}>
                <SettingsIcon fontSize="large" />
              </IconButton>
              <IconButton className="icon-button" size="large" onClick={() => setMessageDrawerOpen(true)}>
                <EmailIcon fontSize="large" />
              </IconButton>
              <MessageDrawer
                anchor="right"
                open={isMessageDrawerOpen}
                onClose={() => setIsMessageDrawerOpen(false)}
                darkMode={darkMode}
              />
                <CustomDrawer
                  darkMode={darkMode}
                  anchor="right"
                  open={drawerOpen}
                  onClose={() => setDrawerOpen(false)}
                >
                <div className="components">
                  <h3 className="legend-titles">Layout Settings</h3>
                  <div>
                    <p className="legend-titles">Node Repulsion</p>
                    <PrettoSlider
                      valueLabelDisplay="auto"
                      aria-label="pretto slider"
                      value={layoutOptions.nodeRepulsion}
                      min={0}
                      max={20000}
                      step={100}
                      onChange={(e, val) =>
                        setLayoutOptions((prev) => ({ ...prev, nodeRepulsion: val }))
                      }
                    />
                    <p className="legend-titles">Ideal Edge Length</p>
                     <PrettoSlider
                      valueLabelDisplay="auto"
                      aria-label="pretto slider"
                      value={layoutOptions.idealEdgeLength}
                      min={0}
                      max={500}
                      step={10}
                      onChange={(e, val) =>
                        setLayoutOptions((prev) => ({ ...prev, idealEdgeLength: val }))
                      }
                    />
                    <p className="legend-titles">Elasticity</p>
                    <PrettoSlider
                      valueLabelDisplay="auto"
                      aria-label="pretto slider"
                      value={layoutOptions.edgeElasticity}
                      min={0}
                      max={2}
                      step={0.1}
                      onChange={(e, val) =>
                        setLayoutOptions((prev) => ({ ...prev, edgeElasticity: val }))
                      }
                    />
                   <Button
                  sx={{
                    bgcolor: 'rgb(0, 151, 189)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'white',
                      color: 'rgb(0, 151, 189)',
                    },
                  }}
                  variant="contained"
                  onClick={handleApplyLayout}
                  size="medium"
                >
                  Apply Layout
                </Button>
                  </div>
                  <ArrowCircleRightIcon
                    className="mt-3 legend-titles"  
                    onClick={() => setDrawerOpen(false)}
                    sx={{ fontSize: 40 }}
                  />
                </div>
              </CustomDrawer>
            </div>
          </Col>
        </Row>
      </Container>
    </CyContext.Provider>          
  );
}

export default GraphPage;
