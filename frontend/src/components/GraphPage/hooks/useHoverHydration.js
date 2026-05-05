import { useEffect } from "react";
import { buildElements } from "../../utils/buildElements";
import { getClusterConfigForId } from "../../NodeDetalParts/useNodeDetail";

export function useHoverHydration({
  cyInstance,
  graphName,
  hoveredNodeRef,
  setHoveredNode,
  loadFromStore,
  callDetailCacheRef,
}) {
  useEffect(() => {
    let lastHoveredId = null;
    let cancelled = false;

    const cleanKey = (k) => String(k || "").replace("_cose", "");

    const getLayerKey = () =>
      cleanKey(
        (cyInstance && !cyInstance.destroyed?.() ? cyInstance.scratch?.("layerKey") : null) ||
          graphName
      );

    const getDatasetKey = () =>
      cleanKey(
        (cyInstance && !cyInstance.destroyed?.() ? cyInstance.scratch?.("graphName") : null) ||
          graphName
      );

    const getNodeId = (n) => String(n?.id ?? n?.data?.id ?? "");
    const getNodeTypeLower = (n) =>
      String(n?.type ?? n?.category ?? n?.data?.type ?? n?.data?.category ?? "").toLowerCase();

    const countDestinationsInClusterRaw = (clusterRaw) => {
      try {
        const full = buildElements(clusterRaw);
        const nodes = full?.nodeElements || [];
        return nodes.filter((el) => {
          const d = el?.data || {};
          const t = String(d.type || d.category || "").toLowerCase();
          return t.includes("destination");
        }).length;
      } catch {
        return null;
      }
    };

    const computeCallIdsForDestination = (clusterRaw, destinationId) => {
      try {
        const full = buildElements(clusterRaw);
        const nodes = full?.nodeElements || [];
        const edges = full?.edgeElements || [];

        const typeById = new Map(
          nodes.map((el) => {
            const d = el?.data || {};
            return [String(d.id || ""), String(d.type || d.category || "").toLowerCase()];
          })
        );

        const destId = String(destinationId);
        const callIds = new Set();

        edges.forEach((el) => {
          const d = el?.data || {};
          const et = String(d.type || d.category || d.label || "").toUpperCase();
          if (!et.includes("HAS_CALL")) return;

          const s = String(d.source ?? "");
          const t = String(d.target ?? "");
          if (!s || !t) return;

          if (s !== destId && t !== destId) return;

          const other = s === destId ? t : s;
          const otherType = typeById.get(other) || "";
          if (otherType && !otherType.includes("call")) return;

          callIds.add(other);
        });

        return callIds;
      } catch {
        return null;
      }
    };

    const hydrateHoveredNode = async (node) => {
      if (!node) {
        setHoveredNode(null);
        return;
      }

      const nodeId = getNodeId(node);
      if (!nodeId) {
        setHoveredNode(node);
        return;
      }

      setHoveredNode(node);

      const typeLower = getNodeTypeLower(node);
      const isCall = typeLower.includes("call");
      const isDestination = typeLower.includes("destination");
      const isCluster = typeLower.includes("cluster") || typeLower === "root";

      const layerKey = getLayerKey();
      void layerKey;

      const datasetKey = getDatasetKey();

      if (isCluster) {
        const clusterKey = cleanKey(nodeId);
        const raw = loadFromStore?.(clusterKey);
        const destCount = raw ? countDestinationsInClusterRaw(raw) : null;

        if (!cancelled && nodeId === lastHoveredId && typeof destCount === "number") {
          setHoveredNode((prev) => ({
            ...(prev || node),
            destination_count: destCount,
            node_count: destCount + 1,
          }));
        }
        return;
      }

      if (isDestination) {
        if (datasetKey && datasetKey.toLowerCase().startsWith("cluster_")) {
          const raw = loadFromStore?.(datasetKey);
          const callIds = raw ? computeCallIdsForDestination(raw, nodeId) : null;
          const callCount = callIds ? callIds.size : null;

          if (!cancelled && nodeId === lastHoveredId && typeof callCount === "number" && callCount > 0) {
            setHoveredNode((prev) => ({
              ...(prev || node),
              call_count: callCount,
              node_count: callCount + 1,
            }));
          }
        }
        return;
      }

      if (!isCall) return;

      const cached = callDetailCacheRef?.current?.get(nodeId);
      if (cached) {
        if (!cancelled && nodeId === lastHoveredId) setHoveredNode({ ...node, ...cached });
        return;
      }

      try {
        const config = getClusterConfigForId(nodeId);
        if (!config) return;

        const endpoint = config.buildNodeEndpoint(nodeId);
        const res = await fetch(endpoint);
        if (!res.ok) {
          console.error("Failed to hydrate hovered Call node:", nodeId, res.status);
          return;
        }

        const detail = await res.json();
        callDetailCacheRef?.current?.set(nodeId, detail);

        if (!cancelled && nodeId === lastHoveredId) setHoveredNode({ ...node, ...detail });
      } catch (err) {
        console.error("Error hydrating hovered Call node:", err);
      }
    };

    const interval = setInterval(() => {
      const current = hoveredNodeRef.current;

      const currentId = getNodeId(current);
      if (!currentId) {
        if (lastHoveredId !== null) {
          lastHoveredId = null;
          setHoveredNode(null);
        }
        return;
      }

      if (currentId !== lastHoveredId) {
        lastHoveredId = currentId;
        hydrateHoveredNode(current);
      }
    }, 120);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [cyInstance, graphName, hoveredNodeRef, setHoveredNode, loadFromStore, callDetailCacheRef]);
}
