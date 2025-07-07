// src/components/LegendParts/LayoutSwitcher.js
import { Box, Typography, RadioGroup, FormControlLabel, Radio } from "@mui/material";

const LayoutSwitcher = ({ graphName, setGraphName }) => {
  const layoutMode = graphName.endsWith("_cose") ? "cose" : "klay";

  const handleLayoutChange = (e) => {
    const selectedLayout = e.target.value;
    setGraphName((prev) =>
      selectedLayout === "klay"
        ? prev.replace("_cose", "")
        : prev.endsWith("_cose") ? prev : prev + "_cose"
    );
  };

  return (
    <Box>
      <Typography className="legend-titles" variant="subtitle1" fontWeight="bold">
        Layout Mode
      </Typography>
      <Box sx={{ mt: 1, ml: 1 }}>
        <RadioGroup value={layoutMode} onChange={handleLayoutChange}>
          <FormControlLabel
            value="cose"
            control={<Radio sx={{ color: "white" }} />}
            label="Default"
            sx={{ color: "white" }}
          />
          <FormControlLabel
            value="klay"
            control={<Radio sx={{ color: "white" }} />}
            label="Tree"
            sx={{ color: "white" }}
          />
        </RadioGroup>
      </Box>
    </Box>
  );
};

export default LayoutSwitcher;
