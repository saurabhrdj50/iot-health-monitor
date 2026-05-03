import React, { memo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Activity, Droplets, Hand, Heart, Thermometer } from 'lucide-react';
import { formatReading } from '../../lib/dashboard';

const iconMap = {
  heart_rate: Heart,
  spo2: Droplets,
  body_temperature: Thermometer,
  gsr: Hand,
};

function KpiCard({ kpi, history }) {
  const Icon = iconMap[kpi.key] || Activity;
  const recentHistory = history.slice(-8);
  const sparklineData = recentHistory.map((item, index) => ({ index, value: item[kpi.key] ?? 0 }));
  const ratio = (() => {
    if (kpi.value === null || kpi.value === undefined || kpi.scaleMin === undefined || kpi.scaleMax === undefined) return 0;
    return Math.min(Math.max(((kpi.value - kpi.scaleMin) / (kpi.scaleMax - kpi.scaleMin)) * 100, 0), 100);
  })();

  const strokeColor = kpi.accent === 'blue' ? '#69a5ff' : '#ff4fa3';
  const fillGradientEnd = kpi.accent === 'blue' ? '#6f78ff' : '#ff7f70';

  const statusClass = (() => {
    if (kpi.status === 'LOW' || kpi.status === 'HIGH') return 'kpi-status-risk';
    if (kpi.status === 'ACTIVE') return 'kpi-status-live';
    return 'kpi-status-normal';
  })();

  const iconClass = kpi.accent === 'blue' ? 'kpi-icon-blue' : 'kpi-icon-pink';
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
    if (Math.abs(delta) < threshold) return { symbol: '—', direction: 'stable' };
    const worsening = kpi.key === 'spo2' ? delta < 0 : delta > 0;
    return {
      symbol: delta > 0 ? '↑' : '↓',
      direction: worsening ? (kpi.tone === 'alert' ? 'bad' : 'neutral') : (kpi.tone === 'alert' ? 'good' : 'neutral'),
    };
  })();

  return (
    <div className={`kpi-card kpi-card-reference shimmer-surface gradient-border`}>
      <div className="kpi-head">
        <div className="kpi-title-wrap">
          <Icon className={`h-4 w-4 ${iconClass}`} />
          <span>{kpi.label}</span>
        </div>
        <span className={`kpi-status ${statusClass}`}>
          {statusText}
        </span>
      </div>
      <div className="kpi-body kpi-body-reference">
        <strong style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          {formatReading(kpi.value, kpi.digits)}
          {trendArrow && (
            <span className={`kpi-trend-arrow kpi-trend-${trendArrow.direction}`}>
              {trendArrow.symbol}
            </span>
          )}
        </strong>
        <small>{kpi.unit}</small>
      </div>
      <p className="kpi-subcopy">{kpi.subtitle}</p>
      <div className="sparkline-shell kpi-sparkline-shell">
        {sparklineData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id={`spark-${kpi.key}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.88} />
                  <stop offset="100%" stopColor={fillGradientEnd} stopOpacity={0.92} />
                </linearGradient>
                <linearGradient id={`spark-fill-${kpi.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={fillGradientEnd} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={`url(#spark-${kpi.key})`}
                strokeWidth={2.3}
                fill={`url(#spark-fill-${kpi.key})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </div>
      <div className="kpi-meter kpi-meter-reference">
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
