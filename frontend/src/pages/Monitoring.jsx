import { Card } from '../components/common/Card';
import { Radio } from 'lucide-react';
import { useEffect, useState } from 'react';
import patientService from '../services/patientService';
import { ErrorState } from '../components/common/ErrorState';

const Monitoring = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadPatients = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await patientService.getPatients();
        if (!isMounted) return;
        setPatients(data.patients || []);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load patients:', err);
        if (patients.length === 0) setError(err.message || 'Failed to connect to the backend server.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadPatients();
    return () => { isMounted = false; };
  }, [patients.length]);

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Monitoring Central</h1>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (loading && patients.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Monitoring Central</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(k => <div key={k} className="h-32 bg-[rgba(255,255,255,0.02)] border border-[var(--line)] rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const activePatients = patients.filter(p => p.active);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Monitoring Central</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Live overview of all active patient sensors.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
           <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
           {activePatients.length} Active
        </div>
      </div>

      {activePatients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activePatients.map((patient) => (
            <Card key={patient.id} title={patient.name} onClick={() => window.location.href = `/patients/${patient.id}/live`}>
              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-secondary)]">Room {patient.room || 'N/A'}</span>
                  </div>
                  <div className="px-2 py-1 bg-[var(--success-soft)] text-[var(--success)] rounded text-xs font-semibold tracking-wide">CONNECTED</div>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <p className="text-sm text-[var(--text-muted)]">{patient.doctor || 'No doctor assigned'}</p>
                  <button className="text-[var(--accent)] text-sm hover:underline">View Live →</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-[var(--line)] text-center py-16">
          <div className="text-[var(--text-muted)] flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.02)] border border-[var(--line)] flex items-center justify-center mb-4">
              <Radio className="text-[var(--text-disabled)]" size={32} />
            </div>
            <p className="text-lg font-medium text-[var(--text-primary)]">No active patients</p>
            <p className="text-sm mt-2 max-w-md mx-auto">There are currently no patients connected for live monitoring. Activate a patient from the directory to start receiving telemetry.</p>
            <button className="primary-button mt-6" onClick={() => window.location.href = '/patients'}>
              Go to Directory
            </button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Monitoring;
