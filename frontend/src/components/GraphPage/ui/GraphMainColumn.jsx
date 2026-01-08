import React from "react";
import { Col } from "react-bootstrap";

import NestedGraphController from "../../NestedGraphController";
import ChatBot from "../../ChatBot/ChatBot";

import HoveredNodeInfo from "../HoveredNodeInfo/HoveredNodeInfo";
import GraphStatusBar from "./GraphStatusBar";
import GraphTopBar from "./GraphTopBar";

export default function GraphMainColumn({
  graphName,
  setGraphName,
  loadFromStore,
  effectiveLayout,
  updateOption,
  onGraphStats,
  onCyReady,
  onNodeHover,
  hoveredNode,
  setHoveredNode,
  hoveredNodeRef,
  cyInstance,
  graphStats,
  layoutLabel,
  onResetView,
  onFitView,
}) {
  return (
    <Col
      className="d-flex flex-column p-0"
      style={{ minWidth: 0, minHeight: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}
    >
      <NestedGraphController
        initialGraphName="ROOT"
        layoutOptions={effectiveLayout}
        loadFromStore={loadFromStore}
        onGraphStats={onGraphStats}
        onCyReady={(cy) => onCyReady?.(cy)}
        onNodeHover={onNodeHover}
        onHoverNodeIdChange={() => {}}
        onLevelChange={(key) => {
          setGraphName(key);
          hoveredNodeRef.current = null;
          setHoveredNode(null);
        }}
        targetGraphName={graphName}
        renderLevelBar={({ levels, currentKey, onLevelClick, canGoBack, onBack }) => {
          const isRootLayer = currentKey === "ROOT";
          const isClusterLayer = currentKey.startsWith("Cluster_");
          const isDestinationLayer = currentKey.startsWith("DEST_");

          const layoutSwitchVisible =
            (isRootLayer || isClusterLayer || isDestinationLayer) && graphName !== "HE_2025";

          const layoutMode = effectiveLayout.name === "breadthfirst" ? "tree" : "force";

          return (
            <GraphTopBar
              levels={levels}
              currentKey={currentKey}
              onLevelClick={onLevelClick}
              canGoBack={canGoBack}
              onBack={onBack}
              onResetView={onResetView}
              onFitView={onFitView}
              layoutMode={layoutMode}
              layoutSwitchVisible={layoutSwitchVisible}
              onLayoutModeChange={(mode) => {
                if (!layoutSwitchVisible) return;
                const nextName = mode === "tree" ? "breadthfirst" : "cose-bilkent";
                updateOption("name", nextName);
              }}
            />
          );
        }}
      />

      <div className="graph-main">
        <HoveredNodeInfo
          node={hoveredNode}
          cyInstance={cyInstance}
          graphName={graphName}
          onClose={() => {
            hoveredNodeRef.current = null;
            setHoveredNode(null);
          }}
        />

        <ChatBot />
      </div>

      <GraphStatusBar nodes={graphStats.nodes} edges={graphStats.edges} layoutLabel={layoutLabel} />
    </Col>
  );
}
