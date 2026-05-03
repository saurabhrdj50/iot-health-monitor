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
        <span className="subtle-chip">{history.length} stored readings</span>
      </div>

      <div className="telemetry-table">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Heart Rate</th>
              <th>SpO2</th>
              <th>Temperature</th>
              <th>Respiration</th>
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
                <td>{row.respiratory_rate.toFixed(1)} /min</td>
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
