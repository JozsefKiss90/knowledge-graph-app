// src/components/GraphPage/LegendPanel.js
import { Col, IconButton } from "@mui/material";
import ArrowCircleRightIcon from "@mui/icons-material/ArrowCircleRight";
import Legend from "../LegendToggle";

const LegendPanel = ({
  isCollapsed,
  onExpand,
  onCollapse,
  graphName,
  setGraphName,
  hoveredNodeRef,
  darkMode
}) => {
  return (
    <Col
      xs="auto"
      className="p-0 sidebar-transition"
      style={{
        width: isCollapsed ? 60 : 400,
        backgroundColor: darkMode ? "#1e1e1e" : "#f5f5f5",
        position: "relative"
      }}
    >
      {isCollapsed ? (
        <div className="d-flex flex-column align-items-center justify-content-start pt-2">
          <IconButton
            onClick={onExpand}
            size="large"
            title="Expand Legend"
          >
            <ArrowCircleRightIcon style={{ color: "white" }} fontSize="large" />
          </IconButton>
        </div>
      ) : (
        <Legend
          hoveredNodeRef={hoveredNodeRef}
          graphName={graphName}
          setGraphName={setGraphName}
          onCollapse={onCollapse}
        />
      )}
    </Col>
  );
};

export default LegendPanel;
