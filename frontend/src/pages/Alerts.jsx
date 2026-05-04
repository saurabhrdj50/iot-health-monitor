import { useState } from 'react';
import { Card } from '../components/common/Card';
import { AlertTriangle, Clock, CheckCircle, ShieldAlert, AlertCircle, Info, Activity } from 'lucide-react';

const MOCK_ALERTS = [
  { id: 1, type: 'critical', severity: 98, patient: 'Multiple (3)', room: 'Ward A', message: 'Patients showing sustained elevated heart rates (>15% above baseline).', count: 3, time: 'Just now' },
  { id: 2, type: 'warning', severity: 65, patient: 'Jane Smith', room: '204B', message: 'SpO2 dropped below 94% momentarily.', time: '12 mins ago' },
  { id: 4, type: 'critical', severity: 88, patient: 'Robert Chen', room: '301C', message: 'Irregular rhythm detected during sleep cycle.', time: '18 mins ago' },
  { id: 3, type: 'info', severity: 12, patient: 'System', room: 'Server', message: 'Nightly telemetry database backup completed.', time: '1 hr ago' },
];

const Alerts = () => {
  const [alerts, setAlerts] = useState(MOCK_ALERTS.sort((a, b) => b.severity - a.severity));

  const handleAcknowledge = (id) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const criticalCount = alerts.filter(a => a.type === 'critical').reduce((acc, curr) => acc + (curr.count || 1), 0);
  const warningCount = alerts.filter(a => a.type === 'warning').reduce((acc, curr) => acc + (curr.count || 1), 0);
  const totalResolved = MOCK_ALERTS.reduce((acc, curr) => acc + (curr.count || 1), 0) - alerts.reduce((acc, curr) => acc + (curr.count || 1), 0);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Active Alerts</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Review and manage recent system and patient alerts.</p>
        </div>
        <div className="text-xs font-medium bg-[rgba(255,255,255,0.03)] border border-[var(--line)] px-4 py-2 rounded-lg text-[var(--text-secondary)]">
          <span className="text-[var(--accent)] flex items-center gap-1.5"><Activity size={14}/> ML Prioritization Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Critical" subtitle="Requires immediate action" className={criticalCount > 0 ? "border-[var(--danger)] shadow-[0_0_15px_rgba(244,63,94,0.15)] bg-[rgba(244,63,94,0.02)]" : ""}>
          <p className={`text-4xl font-bold font-mono ${criticalCount > 0 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>{criticalCount}</p>
        </Card>
        <Card title="Warning" subtitle="Monitor closely" className={warningCount > 0 ? "border-[var(--warning)]" : ""}>
          <p className={`text-4xl font-bold font-mono ${warningCount > 0 ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}>{warningCount}</p>
        </Card>
        <Card title="Resolved" subtitle="Session total">
          <p className="text-4xl font-bold text-[var(--success)] font-mono">{totalResolved}</p>
        </Card>
      </div>

      <Card className="border-[var(--line)] overflow-hidden">
        {alerts.length > 0 ? (
          <div className="divide-y divide-[var(--line)]">
            {alerts.map(alert => {
              let Icon = Info;
              let alertColors = "text-[#3b82f6] bg-[rgba(59,130,246,0.1)] border-[rgba(59,130,246,0.3)]";
              
              if (alert.type === 'critical') {
                Icon = ShieldAlert;
                alertColors = "text-[var(--danger)] bg-[var(--danger-soft)] border-[rgba(244,63,94,0.3)] shadow-[0_0_10px_rgba(244,63,94,0.1)]";
              } else if (alert.type === 'warning') {
                Icon = AlertCircle;
                alertColors = "text-[var(--warning)] bg-[var(--warning-soft)] border-[rgba(245,158,11,0.2)]";
              }

              return (
                <div key={alert.id} className="p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 p-2 rounded-lg border ${alertColors}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="font-semibold text-[var(--text-primary)]">{alert.patient}</span>
                        {alert.count > 1 && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[rgba(255,255,255,0.1)] text-[var(--text-primary)]">Grouped</span>
                        )}
                        {alert.room !== 'Server' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] border border-[var(--line-strong)]">Room {alert.room}</span>
                        )}
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 bg-[rgba(0,0,0,0.2)] px-2 py-0.5 rounded border border-[var(--line)]">
                          <span className={`font-bold ${alert.severity > 70 ? 'text-[var(--danger)]' : (alert.severity > 40 ? 'text-[var(--warning)]' : 'text-[#3b82f6]')}`}>PRI {alert.severity}</span>
                        </span>
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 ml-1"><Clock size={12}/>{alert.time}</span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{alert.message}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAcknowledge(alert.id)}
                    className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-medium bg-[rgba(255,255,255,0.03)] border border-[var(--line-strong)] text-[var(--text-primary)] hover:bg-[var(--success-soft)] hover:text-[var(--success)] hover:border-[rgba(16,185,129,0.3)] transition-all active:scale-95"
                  >
                    <CheckCircle size={16} /> Acknowledge
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-[var(--text-muted)] flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[var(--success-soft)] border border-[rgba(16,185,129,0.3)] flex items-center justify-center mb-4">
              <CheckCircle className="text-[var(--success)]" size={32} />
            </div>
            <p className="text-lg font-medium text-[var(--success)]">No active alerts detected</p>
            <p className="text-sm mt-2 max-w-md mx-auto text-[var(--text-secondary)]">The system is operating normally. All connected patient telemetry is actively streaming within safe physiological baselines.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Alerts;
