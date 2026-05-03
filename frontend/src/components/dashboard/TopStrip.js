import React, { memo } from 'react';
import { AlertCircle, CheckCircle2, Cpu, ShieldAlert, Sparkles } from 'lucide-react';
import { formatDateTime, getRiskTone } from '../../lib/dashboard';

export default memo(function TopStrip({ latest, dashboard, health }) {
  const tone = getRiskTone(latest?.prediction);
  const confidence = latest?.probability ? Math.round(Math.max(...Object.values(latest.probability)) * 100) : 0;

  return (
    <section className="top-strip">
      <div className={`signal-banner signal-${tone}`}>
        <div className="signal-title">
          <span className="live-pulse-dot" aria-hidden="true" />
          {latest?.prediction === 'Risk' ? <ShieldAlert className="h-5 w-5" /> : latest?.prediction === 'Stress' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          <span>{latest?.prediction || 'Awaiting telemetry'}</span>
        </div>
        <p>{latest ? `Last updated ${formatDateTime(dashboard.updated_at)}` : 'The device feed has not delivered a reading for this patient yet.'}</p>
        <div className="signal-footer">
          <span>{dashboard.source === 'device' ? 'Live device stream' : 'Manual or standby feed'}</span>
          <span>{dashboard.history.length} samples in view</span>
        </div>
      </div>

      <div className="mini-stat">
        <Cpu className="h-5 w-5" />
        <div>
          <p className="eyebrow">Inference Model</p>
          <strong>{dashboard.model_loaded ? 'Loaded' : 'Fallback Rules'}</strong>
          <p className="mini-subcopy">{health.status === 'healthy' ? 'Continuous scoring active' : 'Backend check required'}</p>
        </div>
      </div>

      <div className="mini-stat">
        <Sparkles className="h-5 w-5" />
        <div>
          <p className="eyebrow">Prediction Confidence</p>
          <strong>{confidence ? `${confidence}%` : 'N/A'}</strong>
          <p className="mini-subcopy">{health.status === 'healthy' ? 'API healthy' : 'API offline'}</p>
        </div>
      </div>
    </section>
  );
});
