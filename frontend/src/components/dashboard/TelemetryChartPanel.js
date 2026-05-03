import React, { memo } from 'react';
import { Activity, Thermometer, TrendingUp, Wind } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Dot,
  Label,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const metricConfig = {
  heart_rate: { label: 'Heart Rate', color: '#3EE8FF', compareColor: '#FF4FD8', band: [60, 100], icon: TrendingUp, unit: 'BPM', thresholdLabel: 'Preferred band' },
  spo2: { label: 'SpO2', color: '#3CFFB6', compareColor: '#3EE8FF', band: [95, 100], icon: Activity, unit: '%', thresholdLabel: 'Safe oxygen band' },
  body_temperature: { label: 'Temperature', color: '#FFC857', compareColor: '#8A5CFF', band: [36.0, 37.5], icon: Thermometer, unit: '°C', thresholdLabel: 'Expected range' },
  respiratory_rate: { label: 'Respiration', color: '#8A5CFF', compareColor: '#3CFFB6', band: [12, 20], icon: Wind, unit: '/min', thresholdLabel: 'Target band' },
};

function ActiveDot(props) {
  const { cx, cy, payload, stroke } = props;
  if (!payload?.anomaly_flag) return <Dot {...props} r={0} />;
  return (
    <g>
      <circle cx={cx} cy={cy} r={11} fill="rgba(255, 90, 122, 0.12)" />
      <circle cx={cx} cy={cy} r={7} fill="rgba(255, 79, 216, 0.16)" />
      <circle cx={cx} cy={cy} r={3.5} fill={stroke} />
    </g>
  );
}

function TrendTooltip({ active, payload, label, metric, selectedMetric, compareMetric, compareMode }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0]?.payload;
  const reading = Number(point?.[selectedMetric] || 0);

  return (
    <div className="chart-tooltip-card">
      <strong>{metric.label}</strong>
      <p>{label}</p>
      <div className="chart-tooltip-value">
        {reading.toFixed(selectedMetric === 'spo2' ? 0 : 1)} {metric.unit}
      </div>
      {compareMode ? (
        <span>
          {metricConfig[compareMetric].label}: {Number(point?.[compareMetric] || 0).toFixed(compareMetric === 'spo2' ? 0 : 1)} {metricConfig[compareMetric].unit}
        </span>
      ) : null}
      <span>{point?.anomaly_flag ? 'Anomaly flagged at this reading' : 'Inside the preferred operating band'}</span>
    </div>
  );
}

function TelemetryChartPanel({ history, loading, selectedMetric, onSelectMetric, compareMetric, onCompareMetricChange, compareMode, onToggleCompareMode }) {
  const metric = metricConfig[selectedMetric];
  const compare = metricConfig[compareMetric];
  const values = history.map((point) => point[selectedMetric]).filter((value) => typeof value === 'number' && !Number.isNaN(value));
  const lower = metric.band[0];
  const upper = metric.band[1];
  const minValue = values.length ? Math.min(...values, lower) : lower;
  const maxValue = values.length ? Math.max(...values, upper) : upper;
  const padding = Math.max((maxValue - minValue) * 0.18, selectedMetric === 'body_temperature' ? 0.4 : 4);
  const anomalyCount = history.filter((item) => item.anomaly_flag).length;
  const latestPoint = history[history.length - 1];

  return (
    <div className="panel chart-panel shimmer-surface">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Telemetry Curve</p>
          <h3>Trend Analysis</h3>
        </div>
        <div className="metric-switcher">
          {Object.entries(metricConfig).map(([key, item]) => {
            const Icon = item.icon;
            return (
              <button key={key} className={`metric-pill shimmer-button ${selectedMetric === key ? 'metric-pill-active' : ''}`} onClick={() => onSelectMetric(key)}>
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="chart-toolbar">
        <button className={`ghost-button small shimmer-button ${compareMode ? 'toolbar-button-active' : ''}`} onClick={onToggleCompareMode}>
          {compareMode ? 'Comparison on' : 'Compare metrics'}
        </button>
        {compareMode ? (
          <div className="compare-select-row">
            {Object.entries(metricConfig)
              .filter(([key]) => key !== selectedMetric)
              .map(([key, item]) => (
                <button key={key} className={`metric-pill shimmer-button ${compareMetric === key ? 'metric-pill-active' : ''}`} onClick={() => onCompareMetricChange(key)}>
                  {item.label}
                </button>
              ))}
          </div>
        ) : null}
      </div>

      <div className="chart-summary-bar">
        <div>
          <span>Monitoring focus</span>
          <strong>{metric.label}</strong>
        </div>
        <div>
          <span>Preferred range</span>
          <strong>{lower} - {upper} {metric.unit}</strong>
        </div>
        <div>
          <span>Latest reading</span>
          <strong>{latestPoint ? `${Number(latestPoint[selectedMetric]).toFixed(selectedMetric === 'spo2' ? 0 : 1)} ${metric.unit}` : '--'}</strong>
        </div>
        <div>
          <span>Anomalies</span>
          <strong>{anomalyCount}</strong>
        </div>
      </div>

      <div className="chart-shell">
        <div className="chart-scanline" aria-hidden="true" />
        {loading || history.length < 2 ? (
          <div className="empty-state telemetry-empty-state">
            <metric.icon className="h-6 w-6" />
            <strong>Trend view waiting on telemetry</strong>
            <p>Collect at least two readings to unlock range overlays, anomalies, and response patterns.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={history} margin={{ top: 20, right: 20, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="metricStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={metric.color} />
                  <stop offset="100%" stopColor="#8A5CFF" />
                </linearGradient>
                <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={metric.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#8A5CFF" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(157, 212, 228, 0.08)" vertical={false} />
              <ReferenceArea y1={metric.band[0]} y2={metric.band[1]} fill="rgba(62, 232, 255, 0.08)" fillOpacity={1} />
              <ReferenceLine y={metric.band[0]} stroke="rgba(211, 235, 242, 0.22)" strokeDasharray="4 4">
                <Label value={metric.thresholdLabel} position="insideTopLeft" fill="rgba(211, 235, 242, 0.7)" fontSize={12} />
              </ReferenceLine>
              <ReferenceLine y={metric.band[1]} stroke="rgba(211, 235, 242, 0.22)" strokeDasharray="4 4" />
              <XAxis dataKey="timeLabel" tickLine={false} axisLine={false} stroke="#8fb6c4" />
              <YAxis tickLine={false} axisLine={false} stroke="#8fb6c4" domain={[minValue - padding, maxValue + padding]} width={54} />
              <Tooltip content={<TrendTooltip metric={metric} selectedMetric={selectedMetric} compareMetric={compareMetric} compareMode={compareMode} />} />
              <Area
                type="monotone"
                dataKey={selectedMetric}
                stroke="url(#metricStroke)"
                strokeWidth={3}
                fill="url(#metricFill)"
                activeDot={<ActiveDot stroke={metric.color} />}
                dot={<ActiveDot stroke={metric.color} />}
                isAnimationActive={false}
              />
              {compareMode ? (
                <Line
                  type="monotone"
                  dataKey={compareMetric}
                  stroke={compare.compareColor}
                  strokeWidth={2}
                  strokeDasharray="7 5"
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default memo(TelemetryChartPanel);
