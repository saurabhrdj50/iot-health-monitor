import React, { memo } from 'react';
import { formatDateTime } from '../../lib/dashboard';

export default memo(function TelemetryTable({ history }) {
  return (
    <section className="panel telemetry-panel gradient-border">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Telemetry Ledger</p>
          <h3>Recent Samples</h3>
        </div>
        <span className="subtle-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', fontSize: '0.74rem', fontWeight: 600 }}>{history.length} stored readings</span>
      </div>

      <div className="telemetry-table">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Heart Rate</th>
              <th>SpO2</th>
              <th>Temperature</th>
              <th>GSR</th>
              <th>Prediction</th>
            </tr>
          </thead>
          <tbody>
            {history.slice(-8).reverse().map((row) => (
              <tr
                key={row.id || row.timestamp}
                className={row.anomaly_flag ? 'telemetry-row-alert' : ''}
              >
                <td>{formatDateTime(row.timestamp)}</td>
                <td>{Math.round(row.heart_rate)} BPM</td>
                <td>{Math.round(row.spo2)}%</td>
                <td>{row.body_temperature !== null && row.body_temperature !== undefined ? `${row.body_temperature.toFixed(1)}°C` : '-'}</td>
                <td>{row.gsr !== null && row.gsr !== undefined ? `${row.gsr.toFixed(1)} kOhm` : '-'}</td>
                <td>
                  <div className="table-status-cell">
                    <span className={`status-pill ${row.prediction === 'Risk' ? 'status-bad' : row.prediction === 'Stress' ? 'status-watch' : 'status-ok'}`}>
                      {row.prediction || 'Unknown'}
                    </span>
                    {row.anomaly_flag ? <span className="table-inline-flag">Anomaly</span> : null}
                  </div>
                </td>
              </tr>
            ))}
            {!history.length ? (
              <tr>
                <td colSpan="6" className="empty-row">No telemetry stored for this patient yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
});
