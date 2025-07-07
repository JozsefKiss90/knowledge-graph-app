import { Box, Typography } from "@mui/material";

const formatLabel = (key) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const HoveredNodeInfo = ({ node, graphName }) => {
  if (!node) return null;

  const cleanGraphName = graphName.replace("_cose", "");

  return (
    <Box className="mt-3 mb-5 p-2 border rounded shadow-sm hovered-node">
      <Typography className="legend-titles" variant="subtitle1" fontWeight="bold">
        Hovered Node
      </Typography>
      <Typography className="legend-titles" variant="body2"><strong>Label:</strong> {node.label}</Typography>
      <Typography className="legend-titles" variant="body2"><strong>Type:</strong> {node.type}</Typography>

      {node.summary && (
        <Typography className="legend-titles" variant="body2" sx={{ color: "white", mt: 1 }}>
          <strong>Summary:</strong><br />{node.summary}
        </Typography>
      )}

      {["Cluster_2", "Cluster_4"].includes(cleanGraphName) && (
        <>
          {["call_id", "call_type", "call_section", "expected_eu_contribution", "indicative_budget"].map((key) =>
            node[key] ? (
              <Typography key={key} className="legend-titles" variant="body2">
                <strong>{formatLabel(key)}:</strong> {node[key]}
              </Typography>
            ) : null
          )}
        </>
      )}
    </Box>
  );
};

export default HoveredNodeInfo;
