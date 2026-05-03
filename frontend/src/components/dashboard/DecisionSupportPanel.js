import React, { useState, memo } from 'react';
import { Brain, CheckCircle2, Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';

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

  return (
    <div className="panel sidebar-stack gradient-border neon-glow">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Decision Support</p>
          <h3>AI + Clinician Loop</h3>
        </div>
      </div>

      <div className="confidence-card">
        <div className="confidence-ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="48" className="ring-base" />
            <circle
              cx="60"
              cy="60"
              r="48"
              className="ring-value"
              style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
            />
          </svg>
          <div>
            <strong>
              {confidence || '--'}%
            </strong>
            <span>Model confidence</span>
          </div>
        </div>
        <p>
          Feedback captured: {feedbackSummary.total_feedback || 0}
          {feedbackSummary.accuracy_ratio !== null && feedbackSummary.accuracy_ratio !== undefined
            ? ` • ${Math.round(feedbackSummary.accuracy_ratio * 100)}% marked accurate`
            : ''}
        </p>
      </div>

      <div className="feedback-box">
        <p className="eyebrow">Validate Prediction</p>
        <h4>Does the current AI state match the patient presentation?</h4>
        {feedbackState.sent ? (
          <div className="feedback-success">
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
            <h3>Streaming Path</h3>
          </div>
          <Brain className="h-5 w-5 text-cyan-200" />
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
