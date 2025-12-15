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
   
      <Box sx={{ mt: 1, ml: 1 }}>
        <RadioGroup value={layoutMode} onChange={handleLayoutChange}>
        <FormControlLabel
          value="cose"
          control={<Radio sx={{ color: "var(--foreground)" }} />}
          label="Default"
          sx={{ color: "var(--foreground)" }}
        />
        <FormControlLabel
          value="klay"
          control={<Radio sx={{ color: "var(--foreground)" }} />}
          label="Tree"
          sx={{ color: "var(--foreground)" }}
        />
        </RadioGroup>
      </Box>
    </Box>
  );
};

export default LayoutSwitcher;
