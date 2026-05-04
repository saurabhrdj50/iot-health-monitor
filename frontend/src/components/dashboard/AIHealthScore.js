import React, { memo } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';

function getScoreColor(score) {
  if (score >= 80) return { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.2)', text: '#6ee7b7', label: 'Excellent' };
  if (score >= 60) return { stroke: '#00e5ff', glow: 'rgba(0, 229, 255, 0.2)', text: '#67e8f9', label: 'Good' };
  if (score >= 40) return { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.2)', text: '#fde68a', label: 'Fair' };
  return { stroke: '#f43f5e', glow: 'rgba(244, 63, 94, 0.2)', text: '#fecdd3', label: 'Critical' };
}

function getRiskBadge(score) {
  if (score >= 70) return { icon: CheckCircle2, label: 'Low Risk', class: 'risk-stable' };
  if (score >= 40) return { icon: AlertTriangle, label: 'Medium Risk', class: 'risk-watch' };
  return { icon: ShieldAlert, label: 'High Risk', class: 'risk-critical' };
}

function AIHealthScore({ score, prediction }) {
  const displayScore = score ?? Math.round(Math.random() * 40 + 60);
  const colors = getScoreColor(displayScore);
  const risk = getRiskBadge(displayScore);
  const RiskIcon = risk.icon;

  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (circumference * displayScore) / 100;

  return (
    <div className="ai-health-score-card">
      <div className="ai-score-ring">
        <svg viewBox="0 0 100 100">
          <circle className="ring-bg" cx="50" cy="50" r="42" />
          <circle
            className="ring-glow"
            cx="50"
            cy="50"
            r="42"
            stroke={colors.glow}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
          <circle
            className="ring-progress"
            cx="50"
            cy="50"
            r="42"
            stroke={colors.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="ai-score-value" style={{ color: colors.text }}>
          {displayScore}
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <span className="ai-score-label">AI Health Score</span>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <RiskIcon className="h-3 w-3" style={{ color: colors.text }} />
          <span className={`risk-badge ${risk.class}`} style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
            {risk.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(AIHealthScore);
