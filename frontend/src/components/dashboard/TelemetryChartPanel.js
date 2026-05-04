import React, { memo, useState } from 'react';
import { Activity, Thermometer, TrendingUp, Zap, Maximize2 } from 'lucide-react';
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
import TimeFilterBar from './TimeFilterBar';

const metricConfig = {
  heart_rate: { label: 'Heart Rate', color: '#fb7185', compareColor: '#a78bfa', band: [60, 100], icon: TrendingUp, unit: 'BPM', thresholdLabel: 'Preferred band' },
  spo2: { label: 'SpO2', color: '#00e5ff', compareColor: '#10b981', band: [95, 100], icon: Activity, unit: '%', thresholdLabel: 'Safe oxygen band' },
  body_temperature: { label: 'Temperature', color: '#fbbf24', compareColor: '#8b5cf6', band: [36.0, 37.5], icon: Thermometer, unit: '°C', thresholdLabel: 'Expected range' },
  gsr: { label: 'GSR Resistance', color: '#8b5cf6', compareColor: '#10b981', band: [150, 450], icon: Zap, unit: 'kOhm', thresholdLabel: 'Typical device band' },
};

function ActiveDot(props) {
  const { cx, cy, payload, stroke } = props;
  if (!payload?.anomaly_flag) return <Dot {...props} r={0} />;
  return (
    <g>
      <circle cx={cx} cy={cy} r={12} fill="rgba(244, 63, 94, 0.10)" />
      <circle cx={cx} cy={cy} r={8} fill="rgba(244, 63, 94, 0.14)" />
      <circle cx={cx} cy={cy} r={4} fill={stroke} />
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

function TelemetryChartPanel({ history, loading, selectedMetric, onSelectMetric, compareMetric, onCompareMetricChange, compareMode, onToggleCompareMode, onExpand }) {
  const metric = metricConfig[selectedMetric];
  const compare = metricConfig[compareMetric];
  const values = history.map((point) => point[selectedMetric]).filter((value) => typeof value === 'number' && !Number.isNaN(value));
  const lower = metric.band[0];
  const upper = metric.band[1];
  const minValue = values.length ? Math.min(...values, lower) : lower;
  const maxValue = values.length ? Math.max(...values, upper) : upper;
  const padding = Math.max((maxValue - minValue) * 0.18, selectedMetric === 'body_temperature' ? 0.4 : selectedMetric === 'gsr' ? 20 : 4);
  const anomalyCount = history.filter((item) => item.anomaly_flag).length;
  const latestPoint = history[history.length - 1];
  const [timeRange, setTimeRange] = useState('24h');

  const filteredHistory = (() => {
    if (!history.length) return [];
    const now = new Date();
    let cutoff;
    switch (timeRange) {
      case '1h': cutoff = new Date(now.getTime() - 3600000); break;
      case '6h': cutoff = new Date(now.getTime() - 21600000); break;
      case '24h': cutoff = new Date(now.getTime() - 86400000); break;
      case '7d': cutoff = new Date(now.getTime() - 604800000); break;
      default: cutoff = new Date(now.getTime() - 86400000);
    }
    const filtered = history.filter((item) => new Date(item.timestamp) >= cutoff);
    return filtered.length ? filtered : history;
  })();

  return (
    <div className="panel chart-panel shimmer-surface">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Telemetry Curve</p>
          <h3>Trend Analysis</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <TimeFilterBar activeRange={timeRange} onChange={setTimeRange} />
          {onExpand && (
            <button className="ghost-button small" onClick={onExpand} aria-label="Expand chart">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="chart-toolbar">
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
        <button className={`ghost-button small shimmer-button ${compareMode ? 'toolbar-button-active' : ''}`} onClick={onToggleCompareMode}>
          {compareMode ? 'Comparison on' : 'Compare metrics'}
        </button>
      </div>

      {compareMode && (
        <div className="compare-select-row" style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {Object.entries(metricConfig)
            .filter(([key]) => key !== selectedMetric)
            .map(([key, item]) => (
              <button key={key} className={`metric-pill shimmer-button ${compareMetric === key ? 'metric-pill-active' : ''}`} onClick={() => onCompareMetricChange(key)}>
                {item.label}
              </button>
            ))}
        </div>
      )}

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
        {loading || filteredHistory.length < 2 ? (
          <div className="empty-state telemetry-empty-state">
            <metric.icon className="h-6 w-6" />
            <strong>Trend view waiting on telemetry</strong>
            <p>Collect at least two readings to unlock range overlays, anomalies, and response patterns.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredHistory} margin={{ top: 20, right: 20, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="metricStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={metric.color} />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={metric.color} stopOpacity={0.24} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148, 191, 219, 0.06)" vertical={false} />
              <ReferenceArea y1={metric.band[0]} y2={metric.band[1]} fill="rgba(0, 229, 255, 0.06)" fillOpacity={1} />
              <ReferenceLine y={metric.band[0]} stroke="rgba(148, 191, 219, 0.18)" strokeDasharray="4 4">
                <Label value={metric.thresholdLabel} position="insideTopLeft" fill="rgba(148, 191, 219, 0.6)" fontSize={11} />
              </ReferenceLine>
              <ReferenceLine y={metric.band[1]} stroke="rgba(148, 191, 219, 0.18)" strokeDasharray="4 4" />
              <XAxis dataKey="timeLabel" tickLine={false} axisLine={false} stroke="#6b8fa8" tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} stroke="#6b8fa8" domain={[minValue - padding, maxValue + padding]} width={50} tick={{ fontSize: 11 }} />
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
