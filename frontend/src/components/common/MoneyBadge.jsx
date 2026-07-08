import React from "react";

// The two-halves money vocabulary, in ONE place (UX-DECISIONS Q6.2, ADR-0006 #5).
// The whole product's honesty contract turns on never letting an advertised euro wear
// an awarded label, so the wording is a constant, not something callers hand-type.
export const MONEY_BADGE = {
  // Work-programme money that is on offer — indicative, not yet awarded to anyone.
  advertised: { label: "Indicative · on offer", title: "Indicative work-programme budget on offer — not awarded" },
  // Real euros already awarded to funded projects, per CORDIS.
  awarded: { label: "Awarded · CORDIS", title: "Real euros already awarded to funded projects — Source: EU CORDIS" },
};

/**
 * A small pill that stamps a money figure with the half it belongs to, so no euro figure is
 * ambiguous about whether it is *on offer* (Advertised) or *already awarded* (Awarded — CORDIS).
 *
 * Placed once per money figure — or once per tightly-grouped set of figures that share a half
 * (a card header, a table column, a strip section) — rather than repeated on identical siblings.
 *
 * Self-contained + theme-aware (see _money-badge.scss): legible on both the light and the navy
 * dark surface, reusable in the call detail, the dashboard, tables and the hover card alike.
 */
export default function MoneyBadge({ kind, size, className = "", title }) {
  const spec = MONEY_BADGE[kind];
  if (!spec) return null;
  const cls =
    `money-badge money-badge--${kind}` +
    (size === "sm" ? " money-badge--sm" : "") +
    (className ? ` ${className}` : "");
  return (
    <span className={cls} title={title || spec.title}>
      {spec.label}
    </span>
  );
}
