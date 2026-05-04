import React from 'react';

export const HealthScore = ({ score = 15 }) => {
  let statusClass = 'text-[var(--danger)] border-[var(--danger)] shadow-[0_0_15px_rgba(244,63,94,0.3)] bg-[var(--danger-soft)]';
  let label = 'Critical';
  
  if (score <= 30) {
    statusClass = 'text-[var(--success)] border-[var(--success)] shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-[var(--success-soft)]';
    label = 'Safe';
  } else if (score <= 70) {
    statusClass = 'text-[var(--warning)] border-[var(--warning)] shadow-[0_0_15px_rgba(245,158,11,0.3)] bg-[var(--warning-soft)]';
    label = 'Moderate';
  }

  // Simple pure-CSS circle representation
  return (
    <div className={`relative flex items-center justify-center w-16 h-16 rounded-full border-4 shadow-lg transition-all duration-500 ease-in-out ${statusClass}`}>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-lg font-bold font-mono tracking-tighter">{score}</span>
        <span className="text-[9px] uppercase tracking-wider opacity-70 -mt-1">{label}</span>
      </div>
    </div>
  );
};

export default HealthScore;
