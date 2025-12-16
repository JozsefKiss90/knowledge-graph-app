// src/components/LegendParts/GraphSelector.js
import { useEffect, useMemo, useState } from "react";
import { buildElements } from "../utils/buildElements";

const groupColors = {
  meta: "#3B82F6",
  sp: "#F59E0B",
  cluster: "#A3E635",
  destination: "#60A5FA",
  call: "#F59E0B",
};

const cleanKey = (k) => String(k || "").replace("_cose", "");

const isClusterKey = (k) => /^Cluster_\d+$/i.test(k);
const isDestKey = (k) => /^DEST_/i.test(k);
const destIdFromKey = (k) => (isDestKey(k) ? String(k).slice(5) : null);

// cluster graph selection still uses _cose
const coseGraphs = new Set(["Cluster_1", "Cluster_2", "Cluster_3", "Cluster_4", "Cluster_5", "Cluster_6"]);

export default function GraphSelector({
  cy,
  graphName,
  setGraphName,
  loadFromStore,
  selectedNodeId,
  onRequestNavigate,
}) {
  const layerKey = cleanKey(graphName);

  // expanded state per tree item id
  const [expanded, setExpanded] = useState(() => new Set(["ROOT"]));

  // cache of children: key -> array of child items
  const [childCache, setChildCache] = useState(() => new Map());

  const toggleExpanded = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectDataset = (datasetKey) => {
    if (datasetKey === "ROOT" || datasetKey === "HE_2025") {
      setGraphName(datasetKey);
      return;
    }
    const clean = cleanKey(datasetKey);
    const next = coseGraphs.has(clean) ? `${clean}_cose` : clean;
    setGraphName(next);
  };

  // ROOT children: HE_2025 + all clusters
  const rootChildren = useMemo(() => {
    const keys = (loadFromStore?.("__keys__") || []).filter((k) => k !== "HE_2025");
    const clusters = keys
      .filter((k) => isClusterKey(k))
      .map((k) => ({
        id: k,
        kind: "cluster",
        label: k.replace(/_/g, " "),
        color: groupColors.cluster,
        hasChildren: true, // destinations
      }));

    return [
      {
        id: "HE_2025",
        kind: "sp",
        label: "Horizon Europe strategic plan (2025 - 2027)",
        color: groupColors.sp,
        hasChildren: false, // (you can add children later if you want)
      },
      ...clusters,
    ];
  }, [loadFromStore]);

  // Lazy-load destinations + calls for a cluster
  const ensureClusterChildren = (clusterKey) => {
    const clean = cleanKey(clusterKey);
    if (childCache.has(clean)) return;

    const raw = loadFromStore?.(clean);
    if (!raw) {
      setChildCache((prev) => new Map(prev).set(clean, []));
      return;
    }

    const full = buildElements(raw);
    const nodes = full?.nodeElements || [];
    const edges = full?.edgeElements || [];

    const nodeById = new Map(nodes.map((n) => [String(n?.data?.id), n]));
    const callTargetsByDest = new Map();

    edges.forEach((e) => {
      const d = e?.data || {};
      const isHasCall = d.type === "HAS_CALL" || d.category === "HAS_CALL";
      if (!isHasCall) return;
      const src = String(d.source);
      const tgt = String(d.target);
      if (!callTargetsByDest.has(src)) callTargetsByDest.set(src, []);
      callTargetsByDest.get(src).push(tgt);
    });

    const destinations = nodes
      .filter((n) => {
        const d = n?.data || {};
        const t = String(d.type || d.category || "").toLowerCase();
        return t === "destination";
      })
      .map((n) => {
        const d = n.data || {};
        const id = String(d.id);
        const label = d.label || d.name || id;

        return {
          id, // destinationId (not DEST_ key)
          kind: "destination",
          label,
          color: groupColors.destination,
          hasChildren: (callTargetsByDest.get(id) || []).length > 0,
          // store context for navigation
          clusterKey: clean,
        };
      });

    // cache destination children now; calls load on demand per destination
    setChildCache((prev) => new Map(prev).set(clean, destinations));

    // also pre-cache calls lists keyed as `clusterKey::destId` to avoid rebuilding later
    setChildCache((prev) => {
      const next = new Map(prev);
      destinations.forEach((dest) => {
        const callIds = callTargetsByDest.get(dest.id) || [];
        const calls = callIds
          .map((cid) => {
            const callNode = nodeById.get(String(cid));
            const cd = callNode?.data || {};
            const label = cd.label || cd.name || String(cid);
            return {
              id: String(cid),
              kind: "call",
              label,
              color: groupColors.call,
              hasChildren: false,
              clusterKey: clean,
              destinationId: dest.id,
            };
          });

        next.set(`${clean}::${dest.id}`, calls);
      });
      return next;
    });
  };

  const ensureDestinationChildren = (clusterKey, destinationId) => {
    const key = `${cleanKey(clusterKey)}::${String(destinationId)}`;
    if (childCache.has(key)) return;
    // If cluster wasn’t expanded yet, expanding cluster first will fill this.
    ensureClusterChildren(clusterKey);
  };

  // Keep expanded path in sync with navigation layer
  useEffect(() => {
    const next = new Set(["ROOT"]);
    if (isClusterKey(layerKey)) {
      next.add(layerKey);
    }
    if (isDestKey(layerKey)) {
      // expand cluster + destination (destination id is in the DEST key)
      const destId = destIdFromKey(layerKey);
      // cluster key is the dataset key for this layer; GraphView stores it in scratch
      const dataset = cy && !cy.destroyed?.() ? cleanKey(cy.scratch("graphName")) : null;
      if (dataset && isClusterKey(dataset)) {
        next.add(dataset);
        if (destId) next.add(`${dataset}::${destId}`);
      }
    }
    setExpanded(next);
  }, [layerKey, cy]);

  const TreeRow = ({ item, depth, isSelected, onClick, onToggle, showToggle }) => (
    <div
      className={`graph-tree-row ${isSelected ? "is-selected" : ""}`}
      style={{ paddingLeft: 10 + depth * 14 }}
    >
      {showToggle ? (
        <button type="button" className="graph-tree-toggle" onClick={onToggle} aria-label="Toggle">
          {expanded.has(item.id) ? "▾" : "▸"}
        </button>
      ) : (
        <span className="graph-tree-toggle-spacer" />
      )}

      <button type="button" className="graph-tree-item" onClick={onClick} title={item.label}>
        <span className="graph-tree-dot" style={{ backgroundColor: item.color }} />
        <span className="graph-tree-label">{item.label}</span>
      </button>
    </div>
  );

  const renderCluster = (clusterItem, depth) => {
    const clusterKey = clusterItem.id;
    const isSel = layerKey === clusterKey;

    const isOpen = expanded.has(clusterKey);
    if (isOpen) ensureClusterChildren(clusterKey);

    const dests = childCache.get(clusterKey) || [];

    return (
      <div key={clusterKey}>
        <TreeRow
          item={{ ...clusterItem, id: clusterKey }}
          depth={depth}
          isSelected={isSel}
          showToggle
          onToggle={() => toggleExpanded(clusterKey)}
          onClick={() => selectDataset(clusterKey)}
        />

        {isOpen &&
          dests.map((dest) => renderDestination(clusterKey, dest, depth + 1))}
      </div>
    );
  };

  const renderDestination = (clusterKey, destItem, depth) => {
    const destId = destItem.id;
    const destKey = `${clusterKey}::${destId}`;

    const currentDestId = isDestKey(layerKey) ? destIdFromKey(layerKey) : null;

    const selectedIsThisDest =
    selectedNodeId && String(selectedNodeId) === String(destId);

    let selectedIsDestination = false;
      try {
        const selNode = cy && !cy.destroyed?.() ? cy.$id(String(selectedNodeId)) : null;
        const t = selNode && selNode.nonempty && selNode.nonempty()
          ? String(selNode.data("type") || selNode.data("category") || "").toLowerCase()
          : "";
        selectedIsDestination = t === "destination";
      } catch {}

      const isSel =
        (isDestKey(layerKey) && currentDestId === destId) ||
        (!isDestKey(layerKey) && selectedIsThisDest && selectedIsDestination);


    const isOpen = expanded.has(destKey);
    if (isOpen) ensureDestinationChildren(clusterKey, destId);

    const calls = childCache.get(destKey) || [];

    return (
      <div key={destKey}>
        <TreeRow
          item={{ ...destItem, id: destKey }}
          depth={depth}
          isSelected={isSel}
          showToggle={destItem.hasChildren}
          onToggle={() => toggleExpanded(destKey)}
          onClick={() => {
            // Request deep navigation (cluster -> destination layer)
            onRequestNavigate?.({ clusterKey, destinationId: destId });
          }}
        />

        {isOpen &&
          calls.map((c) => renderCall(clusterKey, destId, c, depth + 1))}
      </div>
    );
  };

  const renderCall = (clusterKey, destinationId, callItem, depth) => {
    const isSel = selectedNodeId && String(selectedNodeId) === String(callItem.id);

    return (
      <div key={`${clusterKey}::${destinationId}::${callItem.id}`}>
        <TreeRow
          item={{ ...callItem, id: callItem.id }}
          depth={depth}
          isSelected={isSel}
          showToggle={false}
          onToggle={() => {}}
          onClick={() => {
            onRequestNavigate?.({ clusterKey, destinationId, callId: callItem.id });
          }}
        />
      </div>
    );
  };

  // ROOT selection
  const isRootSelected = layerKey === "ROOT";

  return (
    <div className="graph-selector">
      <div className="graph-selector-list" role="tree" aria-label="Graph navigation tree">
        {/* ROOT */}
        <div className="graph-selector-group">
          <div className="graph-selector-group-title">Meta layout</div>

          <TreeRow
            item={{ id: "ROOT", label: "Horizon Europe (meta view)", color: groupColors.meta }}
            depth={0}
            isSelected={isRootSelected}
            showToggle
            onToggle={() => toggleExpanded("ROOT")}
            onClick={() => selectDataset("ROOT")}
          />

          {expanded.has("ROOT") && (
            <div className="graph-tree-children">
              {/* HE_2025 */}
              <TreeRow
                item={{ id: "HE_2025", label: "Horizon Europe strategic plan (2025 - 2027)", color: groupColors.sp }}
                depth={1}
                isSelected={layerKey === "HE_2025"}
                showToggle={false}
                onToggle={() => {}}
                onClick={() => selectDataset("HE_2025")}
              />

              {/* Clusters */}
              <div className="graph-selector-group-title" style={{ marginTop: 10 }}>
                Clusters - 2026
              </div>

              {rootChildren
                .filter((x) => x.kind === "cluster")
                .map((clusterItem) => renderCluster(clusterItem, 1))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
