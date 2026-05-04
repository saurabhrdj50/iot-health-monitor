import React, { useState, memo } from 'react';
import { Brain, CheckCircle2, Loader2, ThumbsUp, ThumbsDown, Signal } from 'lucide-react';

export default memo(function DecisionSupportPanel({
  latest,
  feedbackSummary,
  feedbackState,
  onFeedback,
  diagnostics = [],
}) {
  const confidence = latest?.probability ? Math.round(Math.max(...Object.values(latest.probability)) * 100) : 0;
  const [feedbackGlow, setFeedbackGlow] = useState(null);

  const handleFeedback = (accurate) => {
    setFeedbackGlow(accurate ? 'success' : 'dismiss');
    onFeedback(accurate);
    setTimeout(() => setFeedbackGlow(null), 5000);
  };

  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (circumference * confidence) / 100;
  const ringClass = confidence >= 80 ? 'ring-success' : confidence >= 60 ? '' : confidence >= 40 ? 'ring-warning' : 'ring-danger';

  return (
    <div className="panel sidebar-stack gradient-border neon-glow">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Decision Support</p>
          <h3>AI + Clinician Loop</h3>
        </div>
        <Brain className="h-5 w-5" style={{ color: 'var(--accent)' }} />
      </div>

      <div className="confidence-card">
        <div className="confidence-ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="48" className="ring-base" />
            <circle
              cx="60"
              cy="60"
              r="48"
              className={`ring-value ${ringClass}`}
              style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
            />
          </svg>
          <div>
            <strong>{confidence || '--'}%</strong>
            <span>Model confidence</span>
          </div>
        </div>
        <p style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Feedback captured: {feedbackSummary.total_feedback || 0}
          {feedbackSummary.accuracy_ratio !== null && feedbackSummary.accuracy_ratio !== undefined
            ? ` · ${Math.round(feedbackSummary.accuracy_ratio * 100)}% marked accurate`
            : ''}
        </p>
      </div>

      <div className="feedback-box">
        <p className="eyebrow">Validate Prediction</p>
        <h4 style={{ margin: '6px 0 0', fontSize: '0.92rem', fontWeight: 600 }}>Does the current AI state match the patient presentation?</h4>
        {feedbackState.sent ? (
          <div className="feedback-success" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#6ee7b7', fontSize: '0.84rem', marginTop: 12 }}>
            <CheckCircle2 className="h-4 w-4" />
            Feedback saved into the training feedback ledger.
          </div>
        ) : (
          <div className="feedback-actions">
            <button
              className={feedbackGlow === 'success' ? 'btn-response-success' : ''}
              onClick={() => handleFeedback(true)}
              disabled={feedbackState.sending || !latest}
            >
              {feedbackState.sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
              Accurate
            </button>
            <button
              className={feedbackGlow === 'dismiss' ? 'btn-response-dismiss' : ''}
              onClick={() => handleFeedback(false)}
              disabled={feedbackState.sending || !latest}
            >
              {feedbackState.sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
              Needs review
            </button>
          </div>
        )}
      </div>

      <div className="device-card">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Device Connectivity</p>
            <h3 style={{ fontSize: '0.92rem' }}>Streaming Path</h3>
          </div>
          <Signal className="h-5 w-5" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="device-grid">
          {diagnostics.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
