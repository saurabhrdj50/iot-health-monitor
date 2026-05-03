import React, { useState, useCallback, memo } from 'react';
import { BedDouble, ClipboardCopy, Download, Loader2, Radio, RefreshCw, Stethoscope, User } from 'lucide-react';
import { formatDate } from '../../lib/dashboard';
import { useRelativeTime } from '../../hooks/useRelativeTime';

export default memo(function HeroPanel({
  patient,
  latest,
  health,
  apiBase,
  onActivate,
  onRefresh,
  onExport,
  refreshing,
  canActivate,
}) {
  const liveState = latest?.prediction || 'Standby';
  const latestTime = latest?.timestamp ? new Date(latest.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Waiting';
  const relativeTime = useRelativeTime(latest?.timestamp);
  const realtimeStatus = health.realtime_status || 'checking';
  const telemetryStatus = health.telemetry_polling ? 'Device polling ready' : 'Manual or standby mode';
  const [buttonStates, setButtonStates] = useState({});
  const [copied, setCopied] = useState(false);

  const handleButtonClick = (buttonName, action) => {
    setButtonStates(prev => ({ ...prev, [buttonName]: 'clicked' }));
    action();
    setTimeout(() => {
      setButtonStates(prev => ({ ...prev, [buttonName]: 'success' }));
    }, 300);
    setTimeout(() => {
      setButtonStates(prev => ({ ...prev, [buttonName]: '' }));
    }, 5000);
  };

  const handleCopyPatientInfo = useCallback(() => {
    if (!patient) return;
    const info = [
      `Patient: ${patient.name}`,
      `ID: ${patient.id}`,
      `Room: ${patient.room || 'N/A'}`,
      `Doctor: ${patient.doctor || 'N/A'}`,
      `DOB: ${formatDate(patient.dob)}`,
      `State: ${liveState}`,
      `Telemetry: ${latestTime}`,
    ].join('\n');
    navigator.clipboard.writeText(info).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [patient, liveState, latestTime]);

  return (
    <section className="hero-panel gradient-border neon-glow" aria-label="Active patient overview">
      <div className="hero-scanline" aria-hidden="true" />
      <div className="hero-copy">
        <p className="eyebrow">Active Monitoring Patient</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
          <h2>
            {patient?.name || 'No patient selected'}
          </h2>
          {patient && (
            <button
              className={`copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopyPatientInfo}
              aria-label="Copy patient info to clipboard"
              title="Copy patient details"
            >
              <ClipboardCopy className="h-3 w-3" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
        <p>
          A patient-aware telemetry workspace with live vitals, clinician notes, anomaly thresholds, and shift-ready summaries.
        </p>
        <div className="hero-meta">
          <span><BedDouble className="h-4 w-4" /> {patient?.room || 'Room pending'}</span>
          <span><Stethoscope className="h-4 w-4" /> {patient?.doctor || 'Doctor pending'}</span>
          <span><User className="h-4 w-4" /> DOB {formatDate(patient?.dob)}</span>
        </div>
        <div className="hero-stat-grid">
          <div className="hero-stat-card hero-stat-card-live">
            <span>Current state</span>
            <strong>
              {liveState}
            </strong>
          </div>
          <div className="hero-stat-card">
            <span>Telemetry heartbeat</span>
            <strong>{latestTime}</strong>
            <span className={`last-updated ${relativeTime === 'just now' ? 'recent' : ''}`}>
              {relativeTime || telemetryStatus}
            </span>
          </div>
          <div className="hero-stat-card hero-stat-card-ai">
            <span>Connection path</span>
            <strong>{health.status === 'healthy' ? 'Backend online' : 'Backend unavailable'}</strong>
            <span className="hero-stat-helper">{realtimeStatus.replace(/_/g, ' ')}</span>
            <span className="hero-stat-helper hero-stat-helper-muted">{apiBase}</span>
            <div className="ai-active-indicator" aria-hidden="true">
              <span className="ai-ring" />
              <span>{health.model_loaded ? 'ML model active' : 'Fallback rules active'}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="hero-actions">
        <button
          className={`primary-button ripple-button shimmer-button ${buttonStates.activate ? 'btn-response-success' : ''}`}
          onClick={() => handleButtonClick('activate', onActivate)}
          disabled={!canActivate}
          aria-label="Route live device telemetry to the selected patient"
        >
          <Radio className="h-4 w-4" />
          Route device feed here
        </button>
        <button
          className={`secondary-button ripple-button shimmer-button ${buttonStates.refresh ? 'btn-response-success' : ''}`}
          onClick={() => handleButtonClick('refresh', onRefresh)}
          disabled={!canActivate}
          aria-label="Refresh the latest telemetry snapshot"
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh snapshot
        </button>
        <button
          className={`secondary-button ripple-button shimmer-button ${buttonStates.export ? 'btn-response-success' : ''}`}
          onClick={() => handleButtonClick('export', onExport)}
          disabled={!canActivate}
          aria-label="Export the current patient report as PDF"
        >
          <Download className="h-4 w-4" />
          Export report
        </button>
        <div className="shortcut-hint" style={{ width: '100%', marginTop: '4px', justifyContent: 'flex-end' }}>
          <kbd>D</kbd> Dashboard
          <kbd>W</kbd> Ward
          <kbd>R</kbd> Reports
          <kbd>S</kbd> Settings
        </div>
      </div>
    </section>
  );
});
