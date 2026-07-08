import { useMemo } from "react";
import { getCallDateRange } from "../TimelineScrubber/utils";
import useCordisEvidence from "../CordisEvidence/useCordisEvidence";

// A compare node is a "call" (vs a structure node — programme / pillar / cluster / destination)
// when its Cytoscape type/category says so. Call-level compare (phase-plan Step 6) uses its own
// metric set, so the drawer branches on this instead of the structure metrics in useCompareData.
export function isCallNode(node) {
  if (!node) return false;
  const t = String(node.type || node.category || "").toLowerCase();
  return t === "call";
}

// Advertised budget on a call node arrives as a raw number or a formatted string — strip to a number.
function parseBudget(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[^0-9.eE+-]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeStatusLabel(status) {
  const raw = String(status || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "open") return "Open";
  if (raw === "closed") return "Closed";
  if (raw === "forthcoming" || raw === "upcoming") return "Forthcoming";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// Mirrors NodeDetail.inferCallStatus so a call's status reads the same in compare as in detail.
function deriveStatus(nodeData, openDate, closeDate) {
  const explicit = normalizeStatusLabel(nodeData?.status);
  if (explicit) return explicit;

  const now = new Date();
  if (openDate && openDate.getTime() > now.getTime()) return "Forthcoming";
  if (closeDate) return closeDate.getTime() >= now.getTime() ? "Open" : "Closed";
  if (openDate && openDate.getTime() <= now.getTime()) return "Open";
  return "";
}

// The advertised (work-programme) facts a call carries in its own node data. Deadline/budget are
// the mandated compare set (UX-DECISIONS Q4.3); status + type of action support the "worth it" read.
function computeCallMetrics(nodeData) {
  if (!nodeData) return null;

  const range = getCallDateRange(nodeData) || {};
  const closeDate = range.closeDate || null;
  const openDate = range.openDate || null;

  return {
    status: deriveStatus(nodeData, openDate, closeDate),
    deadline: closeDate,
    openDate,
    budget: parseBudget(nodeData.indicative_budget ?? nodeData.budget),
    typeOfAction: nodeData.type_of_action || nodeData.typeOfAction || "",
    identifier: nodeData.identifier || nodeData.topic_id || nodeData.id || "",
  };
}

/**
 * Call-level compare data (phase-plan Step 6 / UX-DECISIONS Q4.3): each selected call's advertised
 * facts + its A2 funded-track-record evidence. useCordisEvidence is called exactly twice regardless
 * of selection (rules of hooks) — a null id keeps that slot's fetch idle, so a structure node or an
 * empty slot costs nothing. The parent renders CompareCallBody only when the selection is calls.
 */
export function useCallCompareData(nodeA, nodeB) {
  const isCallA = isCallNode(nodeA);
  const isCallB = isCallNode(nodeB);

  // The call-evidence endpoint keys on the call id (same id NodeDetail/CordisBand pass).
  const idA = isCallA ? nodeA.id || nodeA.identifier || null : null;
  const idB = isCallB ? nodeB.id || nodeB.identifier || null : null;

  const evidenceA = useCordisEvidence(idA);
  const evidenceB = useCordisEvidence(idB);

  const metricsA = useMemo(() => (isCallA ? computeCallMetrics(nodeA) : null), [isCallA, nodeA]);
  const metricsB = useMemo(() => (isCallB ? computeCallMetrics(nodeB) : null), [isCallB, nodeB]);

  return {
    callA: { node: nodeA, metrics: metricsA, evidence: evidenceA },
    callB: { node: nodeB, metrics: metricsB, evidence: evidenceB },
  };
}

export { computeCallMetrics };
