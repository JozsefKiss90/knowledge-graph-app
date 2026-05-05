// src/components/LegendParts/TypeToggles.js.
import EdgeTypeToggle from "../LegendParts/EdgeTypeToggle";
import NodeTypeToggle from "../LegendParts/NodeTypeToggle";

const TypeToggles = ({
  cy,
  graphName,
  edgeTypes,
  nodeTypes,
  visibleEdgeTypes,
  visibleNodeTypes,
  toggleEdgeType,
  toggleNodeType
}) => {
  const supported = ["HE_2025", "Cluster_2", "Cluster_3", "Cluster_4", "Cluster_1", "Cluster_5", "Cluster_6" ].includes(graphName.replace("_cose", ""));

  if (!supported) return null;

  return (
    <>
      <EdgeTypeToggle
        cy={cy}
        types={edgeTypes}
        visibleTypes={visibleEdgeTypes}
        onToggle={(type) => toggleEdgeType(type)}
      />
      <NodeTypeToggle
        cy={cy}
        types={nodeTypes}
        visibleTypes={visibleNodeTypes}
        onToggle={(type) => toggleNodeType(type)}
      />
    </>
  );
};

export default TypeToggles;
