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

      // Destination was collapsed — find the promoted call and tap it
      const promoted = cyInstance.nodes(`[promotedFromDest = "${String(destinationId)}"]`);
      if (promoted && !promoted.empty()) {
        const target = callId ? cyInstance.$id(String(callId)) : promoted.first();
        if (target && !target.empty()) target.emit("tap");
        setPendingNav(null);
        return;
      }
    }

    // Direct call navigation at programme level (promoted call, no destination)
    if (callId && !destinationId && currentKey === clusterKey) {
      const n = cyInstance.$id(String(callId));
      if (n && !n.empty()) {
        n.emit("tap");
        setPendingNav(null);
        return;
      }
    }

    if (callId && currentKey.startsWith("DEST_")) {
      // If we have a destinationId, the call lives inside that dest layer
      if (destinationId) {
        const n = cyInstance.$id(String(callId));
        if (n && !n.empty()) {
          n.emit("tap");
          setPendingNav(null);
          return;
        }
      }
      // Otherwise it's a promoted call at the programme level — pop back
      if (clusterKey) {
        setGraphName(clusterKey);
        return;
      }
    }

    if (!destinationId && !callId) {
      setPendingNav(null);
    }
  }, [pendingNav, setPendingNav, cyInstance, graphName, setGraphName]);
}
