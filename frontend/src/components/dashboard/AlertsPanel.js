import React, { useState, memo } from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

export default memo(function AlertsPanel({ alerts, acknowledgedIds, onToggleAck }) {
  const criticalCount = alerts.filter((alert) => alert.tone === 'critical').length;
  const outstandingCount = alerts.filter((alert) => !acknowledgedIds.includes(alert.id)).length;
  const [ackGlow, setAckGlow] = useState({});

  const handleAck = (alertId) => {
    setAckGlow(prev => ({ ...prev, [alertId]: true }));
    onToggleAck(alertId);
    setTimeout(() => {
      setAckGlow(prev => ({ ...prev, [alertId]: false }));
    }, 3000);
  };

  return (
    <div className="panel gradient-border">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Smart Alerts</p>
          <h3>Priority Queue</h3>
        </div>
      </div>

      <div className="alert-summary">
        <span>{criticalCount} critical</span>
        <span>{outstandingCount} outstanding</span>
      </div>

      <div className="alert-list">
        {alerts.map((alert) => {
          const acknowledged = acknowledgedIds.includes(alert.id);
          return (
            <div
              key={alert.id}
              className={`alert-card alert-${alert.tone} ${acknowledged ? 'alert-acknowledged' : ''}`}
            >
              <div className="alert-icon">
                {alert.tone === 'critical' ? <ShieldAlert className="h-4 w-4" /> : alert.tone === 'watch' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              </div>
              <div className="alert-copy">
                <strong>{alert.title}</strong>
                <p>{alert.body}</p>
              </div>
              <button
                className={`ghost-button small ${ackGlow[alert.id] ? 'btn-response-success' : ''}`}
                onClick={() => handleAck(alert.id)}
              >
                {acknowledged ? 'Acknowledged' : 'Acknowledge'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
});
