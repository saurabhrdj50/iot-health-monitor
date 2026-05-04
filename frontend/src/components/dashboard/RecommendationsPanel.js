import React, { memo } from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert, Lightbulb } from 'lucide-react';

export default memo(function RecommendationsPanel({ recommendations }) {
  return (
    <div className="panel gradient-border">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Clinical Suggestions</p>
          <h3>Trend-Based Recommendations</h3>
        </div>
        <Lightbulb className="h-5 w-5" style={{ color: 'var(--warning)' }} />
      </div>
      <div className="recommendation-list">
        {recommendations.map((item) => (
          <div
            key={item.id}
            className={`recommendation-card recommendation-${item.tone}`}
          >
            <div className="recommendation-icon">
              {item.tone === 'critical' ? <ShieldAlert className="h-4 w-4" style={{ color: 'var(--danger)' }} /> : item.tone === 'watch' ? <AlertCircle className="h-4 w-4" style={{ color: 'var(--warning)' }} /> : <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--success)' }} />}
            </div>
            <div>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
