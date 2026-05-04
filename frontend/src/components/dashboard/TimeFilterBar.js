import React, { memo } from 'react';

const TIME_RANGES = [
  { key: '1h', label: '1H' },
  { key: '6h', label: '6H' },
  { key: '24h', label: '24H' },
  { key: '7d', label: '7D' },
];

function TimeFilterBar({ activeRange, onChange }) {
  return (
    <div className="time-filter-bar">
      {TIME_RANGES.map((range) => (
        <button
          key={range.key}
          className={`time-filter-btn ${activeRange === range.key ? 'time-filter-btn-active' : ''}`}
          onClick={() => onChange(range.key)}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

export default memo(TimeFilterBar);
