import React from 'react';

export function KpiSkeletons() {
  return (
    <div className="kpi-grid">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="kpi-card skeleton-card" style={{ animationDelay: `${index * 0.1}s` }}>
          <div className="skeleton-line w-40" />
          <div className="skeleton-waveform">
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
          </div>
          <div className="skeleton-line w-72" />
          <div className="skeleton-meter" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ height = 220 }) {
  return (
    <div className="panel skeleton-panel shimmer-surface" style={{ minHeight: height }}>
      <div className="skeleton-line w-48" />
      <div className="skeleton-line w-72" />
      <div className="skeleton-chip-row">
        <div className="skeleton-chip" />
        <div className="skeleton-chip" />
      </div>
      <div className="skeleton-block" style={{ height: height - 120 }} />
    </div>
  );
}

export function WaveformLoader({ className = '' }) {
  return (
    <div className={`skeleton-waveform ${className}`}>
      <div className="wave-bar" />
      <div className="wave-bar" />
      <div className="wave-bar" />
      <div className="wave-bar" />
      <div className="wave-bar" />
      <div className="wave-bar" />
      <div className="wave-bar" />
    </div>
  );
}
