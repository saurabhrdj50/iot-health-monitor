import React, { memo } from 'react';
import { AlertCircle, CheckCircle2, Sparkles, ShieldAlert } from 'lucide-react';

export default memo(function RecommendationsPanel({ recommendations }) {
  return (
    <div className="panel gradient-border">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Clinical Suggestions</p>
          <h3>Trend-Based Recommendations</h3>
        </div>
        <Sparkles className="h-5 w-5 text-cyan-200" />
      </div>
      <div className="recommendation-list">
        {recommendations.map((item) => (
          <div
            key={item.id}
            className={`recommendation-card recommendation-${item.tone}`}
          >
            <div className="recommendation-icon">
              {item.tone === 'critical' ? <ShieldAlert className="h-4 w-4" /> : item.tone === 'watch' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
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
