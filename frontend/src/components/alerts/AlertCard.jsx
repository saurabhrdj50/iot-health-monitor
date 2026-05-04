import { Card } from '../common/Card';
import { Activity, AlertTriangle, CheckCircle } from 'lucide-react';

const AlertCard = ({ alert, onAcknowledge }) => {
  const severityStyles = {
    critical: { pill: 'status-bad', bg: 'alert-critical' },
    warning: { pill: 'status-watch', bg: 'alert-watch' },
    stable: { pill: 'status-ok', bg: 'alert-stable' },
  };
  const style = severityStyles[alert.severity] || severityStyles.stable;

  return (
    <div className={`alert-card ${style.bg}`}>
      <div className="alert-icon">
        {alert.severity === 'critical' ? (
          <AlertTriangle size={16} className="text-[var(--danger)]" />
        ) : (
          <Activity size={16} className="text-[var(--success)]" />
        )}
      </div>
      <div className="alert-copy">
        <strong>{alert.title}</strong>
        <p>{alert.message}</p>
        <span className="text-xs text-[var(--text-muted)]">{alert.time}</span>
      </div>
      {!alert.acknowledged && (
        <button
          onClick={() => onAcknowledge?.(alert.id)}
          className="secondary-button text-xs py-1 px-3"
        >
          <CheckCircle size={12} />
          Ack
        </button>
      )}
    </div>
  );
};

export default AlertCard;
