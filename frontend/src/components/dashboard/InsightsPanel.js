import React, { memo } from 'react';
import { Sparkles } from 'lucide-react';

export default memo(function InsightsPanel({ insights }) {
  return (
    <div className="panel gradient-border">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Care Insights</p>
          <h3>Trend Summary</h3>
        </div>
        <Sparkles className="h-5 w-5 text-cyan-200" />
      </div>
      <div className="insight-grid">
        {insights.map((insight, index) => (
          <div
            key={insight.label}
            className={`insight-card ${index === 3 ? 'insight-card-featured' : ''}`}
          >
            <span>{insight.label}</span>
            <strong>{insight.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
});
