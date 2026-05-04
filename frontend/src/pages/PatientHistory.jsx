import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import LineChart from '../components/charts/LineChart';
import patientService from '../services/patientService';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';

const PatientHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const dashboard = await patientService.getPatientDashboard(id, { limit: 50 });
        if (!isMounted) return;
        setHistory(dashboard.history || []);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load history:', err);
        setError(err.message || 'Failed to retrieve patient historical logs.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadHistory();
    return () => { isMounted = false; };
  }, [id]);

  if (error) {
    return (
      <div className="space-y-6">
         <div className="flex items-center gap-4">
          <button onClick={() => navigate('/patients')} className="secondary-button transition-transform hover:-translate-x-1">
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Patient History</h1>
        </div>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (loading && history.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button className="secondary-button opacity-50"><ArrowLeft size={16} /> Back</button>
          <div className="w-48 h-8 rounded bg-[rgba(255,255,255,0.05)] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="panel h-64 animate-pulse bg-[rgba(255,255,255,0.02)] border-[var(--line)]"></div>
           <div className="panel h-64 animate-pulse bg-[rgba(255,255,255,0.02)] border-[var(--line)]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/patients')} className="secondary-button transition-transform hover:-translate-x-1">
          <ArrowLeft size={16} />
          Back
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Patient History</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Vitals Trend" className="h-full">
          {history.length > 0 ? (
            <div className="space-y-4">
              <LineChart
                data={history.map(h => ({ time: new Date(h.timestamp).toLocaleTimeString(), value: h.heart_rate }))}
                dataKey="value"
                color="#00e5ff"
                height={250}
              />
              <div className="text-sm text-[var(--text-muted)] mt-4">
                Showing last {history.length} readings
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-[var(--text-muted)]">No historical trend data available.</div>
          )}
        </Card>

        <Card title="Detailed Logs" className="h-full max-h-[400px] overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto pr-2">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="sticky top-0 bg-[var(--bg-elevated)] text-[var(--text-secondary)] shadow-sm z-10">
                <tr>
                  <th className="py-2 px-3 font-semibold uppercase tracking-wider text-xs">Time</th>
                  <th className="py-2 px-3 font-semibold uppercase tracking-wider text-xs">Heart Rate</th>
                  <th className="py-2 px-3 font-semibold uppercase tracking-wider text-xs">SpO2</th>
                  <th className="py-2 px-3 font-semibold uppercase tracking-wider text-xs">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {history.length > 0 ? (
                  history.map((h, i) => (
                    <tr key={i} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <td className="py-3 px-3 text-[var(--text-disabled)]">{new Date(h.timestamp).toLocaleTimeString()}</td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-[var(--text-primary)]">{h.heart_rate}</span> bpm
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-[var(--success)]">{h.spo2}%</span>
                      </td>
                      <td className="py-3 px-3">
                        {h.prediction === 'Normal' ? (
                          <span className="status-pill status-ok">Normal</span>
                        ) : h.prediction === 'Risk' ? (
                          <span className="status-pill status-bad">Critical</span>
                        ) : (
                          <span className="status-pill status-watch">Watch</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[var(--text-muted)]">No data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PatientHistory;
