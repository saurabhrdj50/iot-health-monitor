import React from 'react';
import { Brain, HeartPulse, ShieldAlert, ArrowUpRight, TrendingUp, CheckCircle, Activity } from 'lucide-react';

export const InsightPanel = ({ insights = [] }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="panel bg-[rgba(10,22,40,0.6)] border border-[var(--line-accent)] relative overflow-hidden backdrop-blur-xl">
      {/* Background Glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--accent)] opacity-[0.03] blur-3xl rounded-full pointer-events-none" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
            <Brain className="text-[var(--accent)]" size={16} />
          </div>
          <h3 className="text-[var(--text-primary)] font-semibold flex items-center gap-2">
            AI Explanatory Insights
          </h3>
        </div>
        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-[rgba(255,255,255,0.05)] text-[var(--accent)] border border-[var(--line-accent)] animate-pulse shadow-[0_0_10px_var(--accent-soft)] flex items-center gap-1.5"><Activity size={10}/> Analyzing Stream</span>
      </div>

      <div className="space-y-3">
        {insights.map((insight, idx) => {
          let Icon = HeartPulse;
          let configClass = 'text-[var(--success)] bg-[var(--success-soft)] border-[var(--success)]';
          
          if (insight.type === 'warning') {
            Icon = TrendingUp;
            configClass = 'text-[var(--warning)] bg-[var(--warning-soft)] border-[rgba(245,158,11,0.2)]';
          } else if (insight.type === 'danger') {
            Icon = ShieldAlert;
            configClass = 'text-[var(--danger)] bg-[var(--danger-soft)] border-[rgba(244,63,94,0.2)]';
          } else if (insight.type === 'info') {
            Icon = ArrowUpRight;
            configClass = 'text-[#3b82f6] bg-[rgba(59,130,246,0.1)] border-[rgba(59,130,246,0.3)]';
          }
          
          // Confidence rendering logic
          const conf = insight.confidence;
          let confColor = 'text-[var(--text-muted)]';
          if (conf > 85) confColor = 'text-[var(--success)]';
          else if (conf > 60) confColor = 'text-[var(--warning)]';
          else if (conf) confColor = 'text-[var(--text-disabled)]';

          return (
            <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${configClass.split(' ')[2]} bg-[rgba(0,0,0,0.15)] transition-all hover:bg-[rgba(255,255,255,0.03)] cursor-default`}>
              <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${configClass.split(' ')[1]}`}>
                <Icon className={configClass.split(' ')[0]} size={12} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                   <p className={`text-sm font-medium ${configClass.split(' ')[0]}`}>{insight.title}</p>
                   {conf && <span className={`text-[10px] uppercase font-bold tracking-wider ${confColor}`}>Conf: {conf}%</span>}
                </div>
                {insight.description && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{insight.description}</p>
                )}
                {insight.action && (
                  <div className="mt-2 bg-[rgba(0,0,0,0.2)] border border-[var(--line-strong)] rounded p-2 flex items-start gap-2">
                     <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] mt-0.5 flex-shrink-0">ACT:</span>
                     <p className="text-[11px] text-[var(--text-primary)] leading-tight">{insight.action}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InsightPanel;
