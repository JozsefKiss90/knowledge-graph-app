import React from "react";

const MOCK_ACTIVITY = [
  { icon: "pin", text: "Dashboard view opened", time: "just now" },
  { icon: "sync", text: "Graph data loaded from API", time: "on load" },
  { icon: "graph", text: "All programmes preloaded", time: "on load" },
];

export default function RecentActivity() {
  return (
    <div className="dash-card dash-activity">
      <div className="dash-card__header">
        <h3 className="dash-card__title">Recent activity</h3>
        <span className="dash-card__subtitle">Session events</span>
      </div>
      <ul className="dash-activity__list">
        {MOCK_ACTIVITY.map((a, i) => (
          <li key={i} className="dash-activity__item">
            <span className="dash-activity__icon" data-icon={a.icon} />
            <div className="dash-activity__body">
              <span className="dash-activity__text">{a.text}</span>
              <span className="dash-activity__time">{a.time}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
