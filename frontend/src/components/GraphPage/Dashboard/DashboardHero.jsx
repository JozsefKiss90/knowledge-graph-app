import React from "react";

export default function DashboardHero({
  totalCalls,
  programmeCount,
  openCalls,
  topicsTracked,
}) {
  return (
    <div className="dash-hero">
      <div className="dash-hero__left">
        <p className="dash-hero__eyebrow">
          Portfolio overview &middot; FY {new Date().getFullYear()}
        </p>
        <h1 className="dash-hero__headline">
          <span className="dash-hero__number">
            {totalCalls.toLocaleString()}
          </span>{" "}
          calls across {programmeCount} programmes,
          <br />
          tracked in one graph.
        </h1>
        <p className="dash-hero__subtitle">
          A live view of the funding landscape you saved. Numbers update from
          the graph data; jump back to the graph at any time to see where they
          live.
        </p>
        <div className="dash-hero__chips">
          <span className="dash-hero__chip">
            <strong>{programmeCount}</strong> programmes
          </span>
          <span className="dash-hero__chip">
            <strong>{openCalls}</strong> open calls
          </span>
          <span className="dash-hero__chip">
            <strong>{topicsTracked}</strong> topics tracked
          </span>
        </div>
      </div>
    </div>
  );
}
