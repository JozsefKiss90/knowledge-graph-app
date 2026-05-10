import React from "react";

const BAR_COLORS = [
  "#22C55E", "#60A5FA", "#A78BFA", "#FBBF24", "#F472B6",
  "#22D3EE", "#F87171", "#34D399",
];

export default function TopicDistribution({ topicDistribution }) {
  const total = topicDistribution.reduce((s, t) => s + t.count, 0);
  const max = Math.max(...topicDistribution.map((t) => t.count), 1);

  return (
    <div className="dash-card dash-topics">
      <div className="dash-card__header">
        <div>
          <h3 className="dash-card__title">Topic distribution</h3>
          <span className="dash-card__subtitle">Across all calls</span>
        </div>
        <span className="dash-topics__total">
          Total <strong>{total}</strong>
        </span>
      </div>
      <div className="dash-topics__list">
        {topicDistribution.map((t, i) => (
          <div key={t.name} className="dash-topics__row">
            <span className="dash-topics__name">{t.name}</span>
            <div className="dash-topics__bar-track">
              <div
                className="dash-topics__bar-fill"
                style={{
                  width: `${(t.count / max) * 100}%`,
                  backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                }}
              />
            </div>
            <span className="dash-topics__count">{t.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
