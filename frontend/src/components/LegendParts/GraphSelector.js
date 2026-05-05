// src/components/LegendParts/GraphSelector.js
import { useEffect, useMemo, useRef, useState } from "react";
import { buildElements } from "../utils/buildElements";
import Tooltip from "@mui/material/Tooltip";

const groupColors = {
  meta: "#3B82F6",
  sp: "#F59E0B",
  pillar: "#A78BFA",
  programme: "#22C55E",
  destination: "#60A5FA",
  call: "#F59E0B",
};

const cleanKey = (k) => String(k || "").replace("_cose", "");
const isPillarKey = (k) => /^PILLAR_[A-Z0-9]+$/i.test(String(k || ""));
const isDestKey = (k) => /^DEST_/i.test(String(k || ""));
const destIdFromKey = (k) => (isDestKey(k) ? String(k).slice(5) : null);

const isProgrammeKey = (k) =>
  /^Cluster_\d+$/i.test(String(k || "")) ||
  ["ERC", "MSCA", "INFRA", "EIC", "EIE", "EIT", "MISS", "WIDERA", "DEP", "ERASMUS", "CEF", "CREA", "EURATOM"].includes(
    String(k || "")
  );

const coseGraphs = new Set(["Cluster_1", "Cluster_2", "Cluster_3", "Cluster_4", "Cluster_5", "Cluster_6"]);

const PILLARS = [
  { id: "P1", key: "PILLAR_P1", label: "Pillar I: Excellent Science" },
  { id: "P2", key: "PILLAR_P2", label: "Pillar II: Global Challenges & European Industrial Competitiveness" },
  { id: "P3", key: "PILLAR_P3", label: "Pillar III: Innovative Europe" },
  { id: "WIDERA", key: "PILLAR_WIDERA", label: "WIDERA (cross-pillar)" },
];

const PROGRAMMES_BY_PILLAR = {
  P1: [
    { key: "ERC", label: "ERC" },
    { key: "MSCA", label: "MSCA" },
    { key: "INFRA", label: "Research Infrastructures (INFRA)" },
  ],
  P2: [
    { key: "Cluster_1", label: "CL1 / HLTH (Health)" },
    { key: "Cluster_2", label: "CL2" },
    { key: "Cluster_3", label: "CL3" },
    { key: "Cluster_4", label: "CL4" },
    { key: "Cluster_5", label: "CL5" },
    { key: "Cluster_6", label: "CL6" },
    { key: "MISS", label: "Missions (MISS)" },
  ],
  P3: [
    { key: "EIC", label: "EIC" },
    { key: "EIE", label: "EIE" },
  ],

  // ✅ IMPORTANT: do NOT nest WIDERA under itself
  // The pillar row will open the WIDERA dataset directly.
  WIDERA: [],
};

// Map programme key -> pillar key (so we can auto-open the correct pillar section)
const PROGRAMME_TO_PILLAR = (() => {
  const map = new Map();
  for (const pillar of PILLARS) {
    const list = PROGRAMMES_BY_PILLAR[pillar.id] || [];
    list.forEach((p) => map.set(p.key, pillar.key));
  }

  // ✅ Keep WIDERA as “owned” by the WIDERA pillar (even though we removed nesting)
  map.set("WIDERA", "PILLAR_WIDERA");

  return map;
})();

// Standalone programmes shown under "Programmes" (top level)
const STANDALONE_PROGRAMMES = [
  { key: "DEP", label: "Digital Europe" },
  { key: "ERASMUS", label: "Erasmus+" },
  { key: "CEF", label: "Connecting Europe Facility (CEF)" },
  { key: "CREA", label: "Creative Europe (CREA)" },
  { key: "EURATOM", label: "EURATOM" },
];

export default function GraphSelector({ cy, graphName, setGraphName, loadFromStore, selectedNodeId, onRequestNavigate }) {
  const layerKey = cleanKey(graphName);
  const listRef = useRef(null);

  // Expand state keys:
  // ROOT, EU_PROGRAMMES, HE_ROOT (to show its children), PILLAR_*, programmeKey, programmeKey::destId
  const [expanded, setExpanded] = useState(() => new Set(["ROOT", "EU_PROGRAMMES"]));
  const [childCache, setChildCache] = useState(() => new Map());

  const scrollTargetRef = useRef(null);

  const availableKeys = useMemo(() => new Set(loadFromStore?.("__keys__") || []), [loadFromStore]);

  const requestScrollTo = (rowId) => {
    scrollTargetRef.current = rowId;
  };

  const scrollToRow = (rowId) => {
    const root = listRef.current;
    if (!root || !rowId) return;

    const el =
      root.querySelector(`[data-row-id="${CSS.escape(String(rowId))}"]`) ||
      root.querySelector(".graph-tree-row.is-selected");

    if (!el) return;

    const cRect = root.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const above = eRect.top < cRect.top;
    const below = eRect.bottom > cRect.bottom;

    if (above || below) el.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const toggleExpanded = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      const willOpen = !next.has(id);
      willOpen ? next.add(id) : next.delete(id);
      if (willOpen) requestScrollTo(id);
      return next;
    });
  };

  const selectDataset = (datasetKey) => {
    if (datasetKey === "ROOT" || datasetKey === "HE_ROOT" || datasetKey === "HE_2025") {
      setGraphName(datasetKey);
      return;
    }

    if (isPillarKey(datasetKey)) {
      setGraphName(datasetKey);
      return;
    }

    const clean = cleanKey(datasetKey);
    const next = coseGraphs.has(clean) ? `${clean}_cose` : clean;
    setGraphName(next);
  };

  // -----------------------------
  // Programme -> Destination -> Call cache
  // -----------------------------
  const ensureProgrammeChildren = (programmeKey) => {
    const clean = cleanKey(programmeKey);
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
          id,
          kind: "destination",
          label,
          color: groupColors.destination,
          hasChildren: (callTargetsByDest.get(id) || []).length > 0,
          programmeKey: clean,
        };
      });

    setChildCache((prev) => new Map(prev).set(clean, destinations));

    setChildCache((prev) => {
      const next = new Map(prev);
      destinations.forEach((dest) => {
        const callIds = callTargetsByDest.get(dest.id) || [];
        const calls = callIds.map((cid) => {
          const callNode = nodeById.get(String(cid));
          const cd = callNode?.data || {};
          const label = cd.label || cd.name || String(cid);
          return {
            id: String(cid),
            kind: "call",
            label,
            color: groupColors.call,
            hasChildren: false,
            programmeKey: clean,
            destinationId: dest.id,
          };
        });
        next.set(`${clean}::${dest.id}`, calls);
      });
      return next;
    });
  };

  const ensureDestinationChildren = (programmeKey, destinationId) => {
    const key = `${cleanKey(programmeKey)}::${String(destinationId)}`;
    if (childCache.has(key)) return;
    ensureProgrammeChildren(programmeKey);
  };

  // -----------------------------
  // Auto-expand path based on navigation state
  // -----------------------------
  useEffect(() => {
    const next = new Set(["ROOT", "EU_PROGRAMMES"]);

    // If we are anywhere in HE, expand HE_ROOT so its children are visible inline
    const inHE =
      layerKey === "HE_ROOT" ||
      layerKey === "HE_2025" ||
      isPillarKey(layerKey) ||
      /^Cluster_\d+$/i.test(layerKey) ||
      ["ERC", "MSCA", "INFRA", "EIC", "EIE", "MISS", "WIDERA"].includes(layerKey) ||
      isDestKey(layerKey);

    if (inHE) next.add("HE_ROOT");

    // Expand pillar
    if (isPillarKey(layerKey)) {
      next.add(layerKey);
      requestScrollTo(layerKey);
    }

    // Expand programme dataset; also expand its parent pillar (HE programmes only)
    if (isProgrammeKey(layerKey)) {
      next.add(layerKey);
      const pillarKey = PROGRAMME_TO_PILLAR.get(layerKey);
      if (pillarKey) next.add(pillarKey);
      requestScrollTo(layerKey);
    }

    // Destination layer: expand dataset + destination subtree so calls appear
    if (isDestKey(layerKey)) {
      const destId = destIdFromKey(layerKey);

      const dataset = cy && !cy.destroyed?.() ? cleanKey(cy.scratch("graphName")) : null;
      if (dataset && isProgrammeKey(dataset)) {
        next.add(dataset);

        const pillarKey = PROGRAMME_TO_PILLAR.get(dataset);
        if (pillarKey) next.add(pillarKey);

        if (destId) next.add(`${dataset}::${destId}`);
        if (dataset && destId) requestScrollTo(`${dataset}::${destId}`);
      }
    }

    setExpanded(next);
  }, [layerKey, cy]);

  // -----------------------------
  // Rendering
  // -----------------------------
  const TreeRow = ({ item, depth, isSelected, onClick, onToggle, showToggle }) => (
    <div
      className={`graph-tree-row ${isSelected ? "is-selected" : ""}`}
      data-row-id={item.id}
      style={{ paddingLeft: 10 + depth * 14 }}
    >
      {showToggle ? (
        <button type="button" className="graph-tree-toggle" onClick={onToggle} aria-label="Toggle">
          {expanded.has(item.id) ? "▾" : "▸"}
        </button>
      ) : (
        <span className="graph-tree-toggle-spacer" />
      )}

      <Tooltip
        title={item.fullLabel ?? item.label}
        placement="right"
        arrow
        enterDelay={350}
        slotProps={{
          tooltip: {
            sx: {
              maxWidth: "none",
              whiteSpace: "normal",
              wordBreak: "break-word",
              overflow: "visible",
              textOverflow: "unset",
              lineHeight: 1.25,
              fontSize: 13,
            },
          },
        }}
      >
        <button type="button" className="graph-tree-item" onClick={onClick}>
          <span className="graph-tree-dot" style={{ backgroundColor: item.color }} />
          <span className="graph-tree-label">{item.label}</span>
        </button>
      </Tooltip>
    </div>
  );

  const renderProgramme = (programmeItem, depth) => {
  const programmeKey = programmeItem.key;
  const isSel = layerKey === programmeKey;

  const isOpen = expanded.has(programmeKey);
  if (isOpen) ensureProgrammeChildren(programmeKey);

  const dests = childCache.get(programmeKey) || [];

  return (
    <div key={programmeKey}>
      <TreeRow
        item={{
          id: programmeKey,
          label: programmeItem.label,
          color: groupColors.programme,
        }}
        depth={depth}
        isSelected={isSel}
        showToggle
        onToggle={() => toggleExpanded(programmeKey)}
        onClick={() => {
          requestScrollTo(programmeKey);
          selectDataset(programmeKey);
        }}
      />

      {isOpen && (
        <div className="graph-tree-children">
          {dests.map((dest) => renderDestination(programmeKey, dest, depth + 1))}
        </div>
      )}
    </div>
  );
};

  const renderDestination = (programmeKey, destItem, depth) => {
    const destId = destItem.id;
    const destKey = `${programmeKey}::${destId}`;

    const currentDestId = isDestKey(layerKey) ? destIdFromKey(layerKey) : null;

    const selectedIsThisDest = selectedNodeId && String(selectedNodeId) === String(destId);

    let selectedIsDestination = false;
    try {
      const selNode = cy && !cy.destroyed?.() ? cy.$id(String(selectedNodeId)) : null;
      const t =
        selNode && selNode.nonempty && selNode.nonempty()
          ? String(selNode.data("type") || selNode.data("category") || "").toLowerCase()
          : "";
      selectedIsDestination = t === "destination";
    } catch {}

    const isSel =
      (isDestKey(layerKey) && currentDestId === destId) ||
      (!isDestKey(layerKey) && selectedIsThisDest && selectedIsDestination);

    const isOpen = expanded.has(destKey);
    if (isOpen) ensureDestinationChildren(programmeKey, destId);

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
            requestScrollTo(destKey);
            onRequestNavigate?.({ clusterKey: programmeKey, destinationId: destId });
          }}
        />
        {isOpen &&
          calls.map((c) => (
            <div key={`${programmeKey}::${destId}::${c.id}`}>
              <TreeRow
                item={{ ...c, id: c.id }}
                depth={depth + 1}
                isSelected={selectedNodeId && String(selectedNodeId) === String(c.id)}
                showToggle={false}
                onToggle={() => {}}
                onClick={() => {
                  requestScrollTo(c.id);
                  onRequestNavigate?.({ clusterKey: programmeKey, destinationId: destId, callId: c.id });
                }}
              />
            </div>
          ))}
      </div>
    );
  };

  // -----------------------------
  // Scroll after DOM updates (expanded/cache changes)
  // -----------------------------
  useEffect(() => {
    const target = scrollTargetRef.current;
    if (!target) return;

    const t = setTimeout(() => {
      scrollToRow(target);
    }, 0);

    return () => clearTimeout(t);
  }, [expanded, childCache, layerKey, selectedNodeId]);

  // -----------------------------
  // UI
  // -----------------------------
  const isRootSelected = layerKey === "ROOT";

  return (
    <div className="graph-selector">
      <div className="graph-selector-list" ref={listRef} role="tree" aria-label="Graph navigation tree">
        <div className="graph-selector-group">

          <TreeRow
            item={{ id: "ROOT", label: "EU Funding Programmes", color: groupColors.meta }}
            depth={0}
            isSelected={isRootSelected}
            showToggle
            onToggle={() => toggleExpanded("ROOT")}
            onClick={() => {
              requestScrollTo("ROOT");
              selectDataset("ROOT");
            }}
          />

          {expanded.has("ROOT") && (
            <div className="graph-tree-children">
              <TreeRow
                item={{ id: "EU_PROGRAMMES", label: "Programmes", color: groupColors.programme }}
                depth={1}
                isSelected={false}
                showToggle
                onToggle={() => toggleExpanded("EU_PROGRAMMES")}
                onClick={() => {}}
              />

              {expanded.has("EU_PROGRAMMES") && (
                <div className="graph-tree-children">
                  {/* Horizon Europe: embedded children (no separate list) */}
                  <TreeRow
                    item={{ id: "HE_ROOT", label: "Horizon Europe", color: groupColors.programme }}
                    depth={2}
                    isSelected={layerKey === "HE_ROOT" || layerKey === "HE_2025" || isPillarKey(layerKey) || /^Cluster_\d+$/i.test(layerKey)}
                    showToggle
                    onToggle={() => toggleExpanded("HE_ROOT")}
                    onClick={() => {
                      requestScrollTo("HE_ROOT");
                      selectDataset("HE_ROOT");
                    }}
                  />

                  {expanded.has("HE_ROOT") && (
                    <div className="graph-tree-children">
                      <TreeRow
                        item={{ id: "HE_2025", label: "Horizon Europe strategic plan (2025 - 2027)", color: groupColors.sp }}
                        depth={3}
                        isSelected={layerKey === "HE_2025"}
                        showToggle={false}
                        onToggle={() => {}}
                        onClick={() => {
                          requestScrollTo("HE_2025");
                          selectDataset("HE_2025");
                        }}
                      />

                      {/* Pillars nested directly under HE_ROOT */}
                      {PILLARS.map((p) => {
                        const isWideraPillar = p.id === "WIDERA";

                        return (
                          <div key={p.key}>
                            <TreeRow
                              item={{ id: p.key, label: p.label, color: groupColors.pillar }}
                              depth={3}
                              isSelected={isWideraPillar ? layerKey === "WIDERA" : layerKey === p.key}
                              showToggle={!isWideraPillar}
                              onToggle={() => {
                                if (!isWideraPillar) toggleExpanded(p.key);
                              }}
                              onClick={() => {
                                requestScrollTo(p.key);

                                // ✅ Clicking the WIDERA pillar opens the WIDERA dataset directly
                                if (isWideraPillar) {
                                  selectDataset("WIDERA");
                                  return;
                                }

                                selectDataset(p.key);
                              }}
                            />

                            {/* ✅ No nested children under WIDERA pillar (prevents WIDERA → WIDERA duplication) */}
                            {!isWideraPillar && expanded.has(p.key) && (
                              <div className="graph-tree-children">
                                {(PROGRAMMES_BY_PILLAR[p.id] || [])
                                  .filter((prg) => availableKeys.has(prg.key))
                                  .map((prg) => renderProgramme(prg, 4))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Standalone programmes as expandable programme trees */}
                  {STANDALONE_PROGRAMMES.filter((p) => availableKeys.has(p.key)).map((p) => renderProgramme(p, 2))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
