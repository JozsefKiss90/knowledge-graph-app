import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import useCordisFieldTree from "./useCordisFieldTree";
import useCordisFieldCalls from "./useCordisFieldCalls";
import { getDatasetConfigForId } from "../../NodeDetalParts/useNodeDetail";

const fmt = (n) => (n || 0).toLocaleString();
const pct = (share) => Math.round((share || 0) * 100);

// One field row + its (lazily rendered) descendants. The label selects the field (loads its calls); the
// ▸/▾ toggle expands/collapses. Synthetic gap nodes (ancestor codes never classified directly) show their
// code, never an invented EuroSciVoc name.
function FieldRow({ node, expanded, onToggle, selectedCode, onSelect }) {
  const hasChildren = node.children && node.children.length > 0;
  const isOpen = expanded.has(node.code);
  const isSelected = selectedCode === node.code;
  return (
    <>
      <div
        className={`cordis-fields__row${isSelected ? " cordis-fields__row--selected" : ""}`}
        style={{ paddingLeft: 6 + (node.depth - 1) * 14 }}
      >
        <button
          type="button"
          className="cordis-fields__toggle"
          onClick={() => hasChildren && onToggle(node.code)}
          tabIndex={hasChildren ? 0 : -1}
          aria-label={hasChildren ? (isOpen ? "Collapse" : "Expand") : undefined}
          style={{ visibility: hasChildren ? "visible" : "hidden" }}
        >
          {isOpen ? "▾" : "▸"}
        </button>
        <button
          type="button"
          className={`cordis-fields__label${node.synthetic ? " cordis-fields__label--synthetic" : ""}`}
          onClick={() => onSelect(node.code)}
          title={node.synthetic ? `Unlabelled field group (${node.code})` : node.title}
        >
          {node.synthetic ? `field group ${node.code}` : node.title}
        </button>
        <span
          className="cordis-fields__counts"
          title={`${fmt(node.projectCount)} funded projects · ${fmt(node.callCount)} calls (this field and below)`}
        >
          {fmt(node.projectCount)} proj &middot; {fmt(node.callCount)} calls
        </span>
      </div>
      {hasChildren && isOpen &&
        node.children.map((c) => (
          <FieldRow
            key={c.code}
            node={c}
            expanded={expanded}
            onToggle={onToggle}
            selectedCode={selectedCode}
            onSelect={onSelect}
          />
        ))}
    </>
  );
}

/**
 * B5 — Research-field explorer (dashboard panel body): browse the EuroSciVoc research-field hierarchy and,
 * for any field, see how many EU-funded projects sit under it and which Horizon Europe calls are funded in it.
 * Clicking a call opens its detail page (/node/:id) — a subject-first path into the graph, complementing the
 * programme-first drill-down. Pure read of existing CORDIS edges. Honest: counts are EU-funded participation,
 * not quality/impact, and overlap across branches.
 *
 * Previously a right-anchored portal drawer; now rendered inline inside the dashboard's tool panel. The
 * `cordis-fields*` class names are unchanged so the existing styles apply.
 */
export default function CordisFieldExplorer() {
  const { loading, data, error } = useCordisFieldTree("default", true);
  const [expanded, setExpanded] = useState(() => new Set());
  const [selectedCode, setSelectedCode] = useState(null);
  const initRef = useRef(false);

  // Memoise so the array identity is stable across renders (data?.tree || [] would make a fresh [] each
  // render and churn the default-expand effect's deps).
  const tree = useMemo(() => data?.tree || [], [data]);
  const calls = useCordisFieldCalls(selectedCode);

  // Expand the top two domains once, for orientation (doesn't fight later user collapses).
  useEffect(() => {
    if (!initRef.current && tree.length) {
      initRef.current = true;
      setExpanded(new Set(tree.slice(0, 2).map((n) => n.code)));
    }
  }, [tree]);

  const onToggle = useCallback((code) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const hasTree = tree.length > 0;
  const selected = calls.data;

  return (
    <div className="cordis-fields dash-tool-panel__tool">
      <div className="cordis-fields__hint">
        Browse EU-funded research fields (EuroSciVoc) and the Horizon Europe calls funded in each. A project
        can sit in several fields, so counts overlap across branches. Calls are ranked by how much of their
        funded research falls in the field; loosely-related ones are trimmed. These are EU-funded
        participation counts — not scientific quality or impact.
      </div>

      {loading ? (
        <div className="cordis-fields__empty">Loading research fields…</div>
      ) : !hasTree ? (
        <div className="cordis-fields__empty">
          No CORDIS research-field data yet. Run the CORDIS ingest (<code>/cordis/tag-calls</code>) to
          populate funded-project research fields, then reopen this panel.
          {error ? <div className="cordis-fields__empty-err">({error})</div> : null}
        </div>
      ) : (
        <>
          <div className="cordis-fields__tree" role="tree">
            {tree.map((n) => (
              <FieldRow
                key={n.code}
                node={n}
                expanded={expanded}
                onToggle={onToggle}
                selectedCode={selectedCode}
                onSelect={setSelectedCode}
              />
            ))}
          </div>

          <div className="cordis-fields__calls">
            {!selectedCode ? (
              <div className="cordis-fields__calls-empty">
                Select a research field above to list the Horizon Europe calls funded in it.
              </div>
            ) : calls.loading ? (
              <div className="cordis-fields__calls-empty">Loading calls…</div>
            ) : !selected ? (
              <div className="cordis-fields__calls-empty">
                No CORDIS-funded calls recorded in this field.
              </div>
            ) : (selected.calls || []).length === 0 ? (
              (selected.fieldCallCount || 0) > 0 ? (
                <div className="cordis-fields__calls-empty">
                  {fmt(selected.fieldCallCount)} call{selected.fieldCallCount === 1 ? "" : "s"} touch this
                  field, but in each fewer than {pct(selected.relevanceFloor)}% of the call’s funded projects
                  fall here — only loosely related, so none are shown as relevant.
                </div>
              ) : (
                <div className="cordis-fields__calls-empty">
                  No CORDIS-funded calls recorded in this field.
                </div>
              )
            ) : (
              <>
                <div className="cordis-fields__calls-head">
                  Calls in “{selected.title || `field ${selected.code}`}”
                  <span
                    className="cordis-fields__calls-total"
                    title={`Ranked by relevance — the share of each call’s classified funded projects that fall in this field`}
                  >
                    most relevant first
                  </span>
                </div>
                <ul className="cordis-fields__calls-list">
                  {(selected.calls || []).map((c) => {
                    const graphName = getDatasetConfigForId(c.id).graphName;
                    const share = pct(c.share);
                    return (
                      <li key={c.id} className="cordis-fields__call-row">
                        <div className="cordis-fields__call-main">
                          <Link
                            to={`/node/${encodeURIComponent(c.id)}`}
                            state={{ graphName, returnGraphName: graphName }}
                            onClick={() => localStorage.setItem("graphName", graphName)}
                            title={c.name}
                            className="cordis-fields__call-name"
                          >
                            {c.name || c.callId || c.identifier || c.id}
                          </Link>
                          {c.subject ? (
                            <div className="cordis-fields__call-subject">{c.subject}</div>
                          ) : null}
                        </div>
                        <span
                          className="cordis-fields__call-count"
                          title={`${share}% relevance — ${fmt(c.projectCount)} of ${fmt(
                            c.callProjectCount
                          )} of this call’s classified funded projects are in this field`}
                        >
                          {share}% &middot; {fmt(c.projectCount)} proj
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {selected.capped || (selected.hiddenIncidental || 0) > 0 ? (
                  <div className="cordis-fields__calls-capped">
                    {selected.capped
                      ? `Showing the top ${fmt((selected.calls || []).length)} of ${fmt(
                          selected.relevantCallCount
                        )} relevant calls. `
                      : null}
                    {(selected.hiddenIncidental || 0) > 0
                      ? `${fmt(selected.hiddenIncidental)} loosely-related call${
                          selected.hiddenIncidental === 1 ? "" : "s"
                        } hidden (under ${pct(selected.relevanceFloor)}% of their funded projects fall in this field).`
                      : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </>
      )}

      <div className="cordis-fields__prov">
        {data?.provenance ||
          "EuroSciVoc research fields of CORDIS-funded projects (CORDIS, FP7–Horizon Europe)"}
      </div>
    </div>
  );
}
