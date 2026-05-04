import React, { memo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Activity, Droplets, Hand, Heart, Thermometer, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatReading } from '../../lib/dashboard';

const iconMap = {
  heart_rate: Heart,
  spo2: Droplets,
  body_temperature: Thermometer,
  gsr: Hand,
};

const accentClassMap = {
  heart_rate: 'kpi-icon-rose',
  spo2: 'kpi-icon-cyan',
  body_temperature: 'kpi-icon-amber',
  gsr: 'kpi-icon-purple',
};

function KpiCard({ kpi, history }) {
  const Icon = iconMap[kpi.key] || Activity;
  const recentHistory = history.slice(-8);
  const sparklineData = recentHistory.map((item, index) => ({ index, value: item[kpi.key] ?? 0 }));
  const ratio = (() => {
    if (kpi.value === null || kpi.value === undefined || kpi.scaleMin === undefined || kpi.scaleMax === undefined) return 0;
    return Math.min(Math.max(((kpi.value - kpi.scaleMin) / (kpi.scaleMax - kpi.scaleMin)) * 100, 0), 100);
  })();

  const strokeColor = kpi.accent === 'blue' ? '#60a5fa' : kpi.key === 'heart_rate' ? '#fb7185' : kpi.key === 'spo2' ? '#00e5ff' : kpi.key === 'gsr' ? '#a78bfa' : '#fbbf24';
  const fillGradientEnd = kpi.accent === 'blue' ? '#818cf8' : kpi.key === 'heart_rate' ? '#f43f5e' : kpi.key === 'spo2' ? '#8b5cf6' : kpi.key === 'gsr' ? '#d946ef' : '#f59e0b';

  const statusClass = (() => {
    if (kpi.status === 'LOW' || kpi.status === 'HIGH') return 'kpi-status-risk';
    if (kpi.status === 'ACTIVE') return 'kpi-status-live';
    return 'kpi-status-normal';
  })();

  const iconClass = accentClassMap[kpi.key] || 'kpi-icon-blue';
  const statusText = kpi.status || 'NORMAL';
  const minLabel = kpi.scaleMin ?? 0;
  const maxLabel = kpi.scaleMax ?? 100;

  const trendArrow = (() => {
    if (history.length < 2) return null;
    const last = history[history.length - 1]?.[kpi.key];
    const prev = history[history.length - 2]?.[kpi.key];
    if (typeof last !== 'number' || typeof prev !== 'number') return null;
    const delta = last - prev;
    const threshold = kpi.key === 'body_temperature' ? 0.1 : kpi.key === 'spo2' ? 0.5 : 1.5;
    if (Math.abs(delta) < threshold) return { Icon: Minus, direction: 'neutral' };
    const worsening = kpi.key === 'spo2' ? delta < 0 : delta > 0;
    return {
      Icon: delta > 0 ? TrendingUp : TrendingDown,
      direction: worsening ? (kpi.tone === 'alert' ? 'bad' : 'neutral') : (kpi.tone === 'alert' ? 'good' : 'neutral'),
    };
  })();

  return (
    <div className="kpi-card shimmer-surface gradient-border">
      <div className="kpi-head">
        <div className="kpi-title-wrap">
          <Icon className={`h-4 w-4 ${iconClass}`} />
          <span>{kpi.label}</span>
        </div>
        <span className={`kpi-status ${statusClass}`}>
          {statusText}
        </span>
      </div>
      <div className="kpi-body">
        <strong>{formatReading(kpi.value, kpi.digits)}</strong>
        <small>{kpi.unit}</small>
        {trendArrow && (
          <span className={`kpi-trend-arrow kpi-trend-${trendArrow.direction}`}>
            <trendArrow.Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="kpi-subcopy">{kpi.subtitle}</p>
      <div className="kpi-sparkline-shell">
        {sparklineData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id={`spark-stroke-${kpi.key}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={fillGradientEnd} stopOpacity={0.95} />
                </linearGradient>
                <linearGradient id={`spark-fill-${kpi.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={fillGradientEnd} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={`url(#spark-stroke-${kpi.key})`}
                strokeWidth={2.5}
                fill={`url(#spark-fill-${kpi.key})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </div>
      <div className="kpi-meter">
        <div className="kpi-meter-fill" style={{ width: `${ratio}%` }} />
      </div>
      <div className="kpi-range-row">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

export default memo(KpiCard);
