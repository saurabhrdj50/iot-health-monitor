import React, { memo } from 'react';
import { Sparkles, TrendingUp, Droplets, Thermometer, Stethoscope } from 'lucide-react';

const insightIconMap = {
  'Heart Trend': TrendingUp,
  'Oxygen Trend': Droplets,
  'Temperature Drift': Thermometer,
  'Care Suggestion': Stethoscope,
};

export default memo(function InsightsPanel({ insights }) {
  return (
    <div className="panel gradient-border">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Care Insights</p>
          <h3>Trend Summary</h3>
        </div>
        <Sparkles className="h-5 w-5" style={{ color: 'var(--accent)' }} />
      </div>
      <div className="insight-grid">
        {insights.map((insight, index) => {
          const Icon = insightIconMap[insight.label] || Sparkles;
          return (
            <div
              key={insight.label}
              className={`insight-card ${index === 3 ? 'insight-card-featured' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon className="h-3.5 w-3.5" style={{ color: 'var(--accent)', opacity: 0.7 }} />
                <span>{insight.label}</span>
              </div>
              <strong>{insight.value}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
});
