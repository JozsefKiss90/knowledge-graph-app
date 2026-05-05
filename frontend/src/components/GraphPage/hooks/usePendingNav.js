import { useEffect } from "react";

export function usePendingNav({ pendingNav, setPendingNav, cyInstance, graphName, setGraphName }) {
  useEffect(() => {
    if (!pendingNav || !cyInstance || cyInstance.destroyed?.()) return;

    const clean = (k) => String(k || "").replace("_cose", "");

    const getLayerKey = () =>
      clean(
        (cyInstance && !cyInstance.destroyed?.() ? cyInstance.scratch?.("layerKey") : null) ||
          graphName
      );

    const { clusterKey, destinationId, callId } = pendingNav;

    const currentKey = getLayerKey();
    const desiredDestKey = destinationId ? `DEST_${String(destinationId)}` : null;

    if (currentKey.startsWith("DEST_") && destinationId) {
      if (currentKey !== desiredDestKey) {
        if (clusterKey) setGraphName(clusterKey);
        return;
      }

      if (!callId) {
        setPendingNav(null);
        return;
      }
    }

    if (clusterKey && currentKey !== clusterKey && !currentKey.startsWith("DEST_")) {
      setGraphName(clusterKey);
      return;
    }

    if (destinationId && currentKey === clusterKey) {
      const n = cyInstance.$id(String(destinationId));
      if (n && !n.empty()) {
        n.emit("tap");
        return;
      }
    }

    if (callId && currentKey.startsWith("DEST_")) {
      const n = cyInstance.$id(String(callId));
      if (n && !n.empty()) {
        n.emit("tap");
        setPendingNav(null);
        return;
      }
    }

    if (!destinationId && !callId) {
      setPendingNav(null);
    }
  }, [pendingNav, setPendingNav, cyInstance, graphName, setGraphName]);
}
