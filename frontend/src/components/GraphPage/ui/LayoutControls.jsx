// src/components/GraphPage/LegendPanel.js
import Button from "@mui/material/Button";
import ArrowCircleRightIcon from "@mui/icons-material/ArrowCircleRight";
import { PrettoSlider } from "./SliderStyles";


const LayoutControls = ({ layoutOptions, updateOption, onApply, onClose }) => (
  <div className="components">
    <h3 className="legend-titles">Layout Settings</h3>

    <p className="legend-titles">Node Repulsion</p>
    <PrettoSlider
      valueLabelDisplay="auto"
      value={layoutOptions.nodeRepulsion}
      min={0}
      max={20000}
      step={100}
      onChange={(e, val) => updateOption("nodeRepulsion", val)}
    />

    <p className="legend-titles">Ideal Edge Length</p>
    <PrettoSlider
      valueLabelDisplay="auto"
      value={layoutOptions.idealEdgeLength}
      min={0}
      max={500}
      step={10}
      onChange={(e, val) => updateOption("idealEdgeLength", val)}
    />

    <p className="legend-titles">Elasticity</p>
    <PrettoSlider
      valueLabelDisplay="auto"
      value={layoutOptions.edgeElasticity}
      min={0}
      max={2}
      step={0.1}
      onChange={(e, val) => updateOption("edgeElasticity", val)}
    />

    <Button
      sx={{
        bgcolor: "rgb(0, 151, 189)",
        color: "white",
        "&:hover": {
          bgcolor: "white",
          color: "rgb(0, 151, 189)"
        }
      }}
      variant="contained"
      onClick={onApply}
      size="medium"
    >
      Apply Layout
    </Button>

    <ArrowCircleRightIcon
      className="mt-3 legend-titles"
      onClick={onClose}
      sx={{ fontSize: 40 }}
    />
  </div>
);

export default LayoutControls;
