import React, { memo } from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="chart-tooltip-card">
        <p>{label}</p>
        <p className="chart-tooltip-value">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const LineChartComponent = memo(({ data, dataKey, title, color = '#00e5ff', height = 300 }) => (
  <div className="w-full">
    {title && <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{title}</h4>}
    <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,191,219,0.1)" />
          <XAxis
            dataKey="time"
            stroke="var(--text-muted)"
            tick={{ fontSize: 12 }}
          />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
));

export default LineChartComponent;
