import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import '../../styles/main.scss';

const NodeTypeToggle = ({ cy, types, visibleTypes, onToggle }) => (

  <Box>
   
    <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
      {types.map((item) => {
        const type = item.type;
        const classType = String(type).replace(/\s+/g, "").toLowerCase();
        const isActive = visibleTypes.has(type);
        const label = typeof item.label === "string" ? item.label : type;
        const swatch = item.color;

        return (
          <Button
            key={type}
            variant={isActive ? "contained" : "outlined"}
            size="small"
            disableElevation
            className={`node-toggle-button type-${classType}${!isActive ? "-active" : ""}`}
            onClick={() => onToggle(type)}
            sx={{
              ...(swatch
                ? isActive
                  ? { backgroundColor: swatch, borderColor: swatch, "&:hover": { backgroundColor: swatch } }
                  : { color: swatch, borderColor: swatch, "&:hover": { borderColor: swatch } }
                : {}),
            }}
          >
            {label.replace("_", " ")}
          </Button>
        );
      })}

    </Box>
  </Box>
);

export default NodeTypeToggle;
