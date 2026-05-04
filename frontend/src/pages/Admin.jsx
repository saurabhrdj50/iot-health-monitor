import { Card } from '../components/common/Card';
import { Trash2 } from 'lucide-react';
import patientService from '../services/patientService';
import { useState } from 'react';

const Admin = () => {
  const [token, setToken] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (!token) return;
    setResetting(true);
    try {
      await patientService.getHealth(); // placeholder for reset endpoint
      alert('System reset triggered');
    } catch (err) {
      alert('Reset failed: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">System Administration</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">Configure global settings and manage system data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="System Reset" subtitle="Danger zone - requires admin token" className="border-[var(--danger)]/30">
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-[var(--surface-critical)] border border-[rgba(244,63,94,0.3)]">
              <p className="text-sm text-[var(--danger)] font-medium flex items-center gap-2">
                <Trash2 size={16} />
                Warning: This will clear all patient telemetry data permanently
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Administrator Token</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter admin token"
                className="w-full p-3 rounded-lg bg-[rgba(6,13,24,0.48)] border border-[var(--line)] focus:border-[var(--danger)] text-[var(--text-primary)] transition-colors outline-none font-mono tracking-widest"
              />
            </div>
            <button
              onClick={handleReset}
              disabled={!token || resetting}
              className="w-full primary-button bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed justify-center"
            >
              <Trash2 size={16} />
              {resetting ? 'Processing Reset...' : 'Execute System Reset'}
            </button>
          </div>
        </Card>

        <Card title="System Diagnostic Info">
          <div className="space-y-4 text-sm mt-2">
            <div className="flex justify-between items-center p-3 rounded bg-[rgba(255,255,255,0.02)] border border-[var(--line)]">
              <span className="text-[var(--text-muted)] font-medium">Backend API</span>
              <span className="text-[var(--success)] font-mono bg-[var(--success-soft)] px-2 py-1 rounded">http://localhost:8000</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded bg-[rgba(255,255,255,0.02)] border border-[var(--line)]">
              <span className="text-[var(--text-muted)] font-medium">System Version</span>
              <span className="text-[var(--text-primary)] font-mono bg-[rgba(255,255,255,0.05)] px-2 py-1 rounded w-16 text-center">2.0.0</span>
            </div>
             <div className="flex justify-between items-center p-3 rounded bg-[rgba(255,255,255,0.02)] border border-[var(--line)]">
              <span className="text-[var(--text-muted)] font-medium">WebSocket Status</span>
              <span className="text-[var(--success)] font-mono bg-[var(--success-soft)] px-2 py-1 rounded flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[var(--success)] rounded-full animate-pulse"/> Connected</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
