import React from "react";

// Lightweight placeholder shown in place of a below-the-fold CORDIS card until it scrolls into view and its
// data loads (plan 12, Part C). It reserves the card's vertical space so the cards below it stay off-screen
// (keeping the lazy fetch meaningful) and the layout doesn't jump when the real card swaps in.
export default function DashCardSkeleton() {
  return (
    <div className="dash-card dash-card-skeleton" aria-hidden="true">
      <div className="dash-card-skeleton__line dash-card-skeleton__line--title" />
      <div className="dash-card-skeleton__line dash-card-skeleton__line--sub" />
      <div className="dash-card-skeleton__body" />
    </div>
  );
}
