import { useEffect } from "react";
import { buildElements } from "../../utils/buildElements";
import { getClusterConfigForId } from "../../NodeDetalParts/useNodeDetail";
import { getCallDateRange } from "../TimelineScrubber/utils";

function isCallCurrentlyOpen(nodeData) {
  const range = getCallDateRange(nodeData);
  if (!range) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const open = range.openDate || range.closeDate;
  const close = range.closeDate || range.openDate;
  return open <= today && close >= today;
}

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

    const countOpenCallsInRaw = (rawData) => {
      try {
        const full = buildElements(rawData);
        const nodes = full?.nodeElements || [];
        return nodes.filter((el) => {
          const d = el?.data || {};
          const t = String(d.type || d.category || "").toLowerCase();
          return t.includes("call") && isCallCurrentlyOpen(d);
        }).length;
      } catch {
        return null;
      }
    };

    const computeOpenCallIdsForDestination = (clusterRaw, destinationId) => {
      try {
        const full = buildElements(clusterRaw);
        const nodes = full?.nodeElements || [];
        const edges = full?.edgeElements || [];

        const nodeDataById = new Map(
          nodes.map((el) => {
            const d = el?.data || {};
            return [String(d.id || ""), d];
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
          const otherData = nodeDataById.get(other);
          const otherType = String(otherData?.type || otherData?.category || "").toLowerCase();
          if (otherType && !otherType.includes("call")) return;
          if (!isCallCurrentlyOpen(otherData)) return;

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
        const callCount = raw ? countOpenCallsInRaw(raw) : null;

        if (!cancelled && nodeId === lastHoveredId && (typeof destCount === "number" || typeof callCount === "number")) {
          setHoveredNode((prev) => ({
            ...(prev || node),
            ...(typeof destCount === "number" ? { destination_count: destCount, node_count: destCount + 1 } : {}),
            ...(typeof callCount === "number" ? { open_call_count: callCount } : {}),
          }));
        }
        return;
      }

      if (isDestination) {
        if (datasetKey) {
          const raw = loadFromStore?.(datasetKey);
          const callIds = raw ? computeOpenCallIdsForDestination(raw, nodeId) : null;
          const callCount = callIds ? callIds.size : null;

          if (!cancelled && nodeId === lastHoveredId && typeof callCount === "number") {
            setHoveredNode((prev) => ({
              ...(prev || node),
              open_call_count: callCount,
            }));
          }
        }
        return;
      }

      const isProgramme = typeLower.includes("programme");
      const isPillar = typeLower.includes("pillar");

      if (isProgramme) {
        // Programme nodes have IDs like PROG_ERC but store keys are ERC
        const progKey =
          node?.programmeKey ||
          node?.data?.programmeKey ||
          cleanKey(nodeId).replace(/^PROG_/i, "");
        const raw = loadFromStore?.(progKey);
        const callCount = raw ? countOpenCallsInRaw(raw) : null;

        if (!cancelled && nodeId === lastHoveredId && typeof callCount === "number") {
          setHoveredNode((prev) => ({
            ...(prev || node),
            open_call_count: callCount,
          }));
        }
        return;
      }

      if (isPillar) {
        // Aggregate calls across all child programmes of this pillar
        const PILLAR_PROGRAMMES = {
          P1: ["ERC", "MSCA", "INFRA"],
          P2: ["Cluster_1", "Cluster_2", "Cluster_3", "Cluster_4", "Cluster_5", "Cluster_6", "MISS"],
          P3: ["EIC", "EIE"],
          WIDERA: ["WIDERA"],
        };
        const pillarId = cleanKey(nodeId).replace(/^PILLAR_/i, "");
        const childKeys = PILLAR_PROGRAMMES[pillarId] || [];
        let totalCalls = 0;
        let foundAny = false;

        for (const key of childKeys) {
          const raw = loadFromStore?.(key);
          if (!raw) continue;
          const count = countOpenCallsInRaw(raw);
          if (typeof count === "number") {
            totalCalls += count;
            foundAny = true;
          }
        }

        if (!cancelled && nodeId === lastHoveredId && foundAny) {
          setHoveredNode((prev) => ({
            ...(prev || node),
            open_call_count: totalCalls,
          }));
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
