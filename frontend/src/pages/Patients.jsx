import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import patientService from '../services/patientService';
import { Card } from '../components/common/Card';
import { Radio, Plus, Activity, FileText, History, Trash2 } from 'lucide-react';
import Table from '../components/common/Table';
import { ErrorState } from '../components/common/ErrorState';

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', age: '', room: '', doctor: '' });
  const navigate = useNavigate();

  const loadPatients = async (isMounted = true) => {
    try {
      setLoading(true);
      setError(null);
      const data = await patientService.getPatients();
      if (!isMounted) return;
      setPatients(data.patients || []);
    } catch (err) {
      if (!isMounted) return;
      console.error('Failed to load patients:', err);
      // Only show error block if we have no existing list to view
      if (patients.length === 0) {
        setError(err.message || 'Failed to retrieve patient directory.');
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadPatients(isMounted);
    return () => { isMounted = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await patientService.addPatient({ ...form, age: form.age ? Number(form.age) : null });
      setForm({ name: '', age: '', room: '', doctor: '' });
      setShowForm(false);
      loadPatients(true);
    } catch (err) {
      console.error('Failed to add patient:', err);
      alert('Failed to add patient. Please check the connection.');
    }
  };

  const handleActivate = async (id) => {
    try {
      await patientService.activatePatient(id);
      loadPatients(true);
    } catch (err) {
      console.error('Failed to activate patient:', err);
      alert('Failed to change patient status.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this patient and all associated telemetry data?")) {
      try {
        await patientService.deletePatient(id);
        loadPatients(true);
      } catch (err) {
        console.error('Failed to delete patient:', err);
        alert('Failed to delete patient.');
      }
    }
  };

  if (error) {
    return (
       <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Patient Directory</h1>
        <ErrorState message={error} onRetry={() => loadPatients(true)} />
      </div>
    );
  }

  if (loading && patients.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="w-48 h-8 bg-[rgba(255,255,255,0.05)] rounded animate-pulse" />
          <div className="w-32 h-10 bg-[rgba(255,255,255,0.05)] rounded animate-pulse" />
        </div>
        <Card>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(k => <div key={k} className="h-12 bg-[rgba(255,255,255,0.02)] rounded animate-pulse" />)}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Patient Directory</h1>
          <p className="text-[var(--text-secondary)] text-sm">Manage enrolled patients and connections.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="primary-button hover:scale-105 transition-transform"
        >
          <Plus size={16} />
          {showForm ? 'Cancel' : 'Admit Patient'}
        </button>
      </div>

      {showForm && (
        <Card title="New Patient Admission" className="border-[var(--line-accent)] shadow-[0_0_20px_rgba(0,229,255,0.1)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                placeholder="Full Name"
                className="w-full p-3 rounded-lg bg-[rgba(6,13,24,0.48)] border border-[var(--line)] focus:border-[var(--line-accent)] text-[var(--text-primary)] outline-none transition-colors"
                required
              />
              <input
                value={form.age}
                onChange={(e) => setForm({...form, age: e.target.value})}
                placeholder="Age"
                type="number"
                className="w-full p-3 rounded-lg bg-[rgba(6,13,24,0.48)] border border-[var(--line)] focus:border-[var(--line-accent)] text-[var(--text-primary)] outline-none transition-colors"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={form.room}
                onChange={(e) => setForm({...form, room: e.target.value})}
                placeholder="Room / Ward"
                className="w-full p-3 rounded-lg bg-[rgba(6,13,24,0.48)] border border-[var(--line)] focus:border-[var(--line-accent)] text-[var(--text-primary)] outline-none transition-colors"
              />
              <input
                value={form.doctor}
                onChange={(e) => setForm({...form, doctor: e.target.value})}
                placeholder="Attending Doctor"
                className="w-full p-3 rounded-lg bg-[rgba(6,13,24,0.48)] border border-[var(--line)] focus:border-[var(--line-accent)] text-[var(--text-primary)] outline-none transition-colors"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="primary-button px-8">Confirm Admission</button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-0 overflow-hidden border-[var(--line)]">
        <Table
          headers={['Patient', 'Age', 'Room', 'Doctor', 'Status', 'Actions']}
          data={patients}
          keyExtractor={(p) => p.id}
          renderRow={(patient) => (
            <>
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] font-bold text-sm">
                    {patient.name?.[0] || '?'}
                  </div>
                  <span className="font-semibold text-[var(--text-primary)]">{patient.name}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-[var(--text-secondary)]">{patient.age || '--'}</td>
              <td className="py-3 px-4 text-[var(--text-secondary)]">{patient.room || 'N/A'}</td>
              <td className="py-3 px-4 text-[var(--text-secondary)]">{patient.doctor || 'Unassigned'}</td>
              <td className="py-3 px-4">
                {patient.active ? (
                  <span className="status-pill status-ok inline-flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"/> Tracking</span>
                ) : (
                  <span className="status-pill status-muted">Inactive</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-2 justify-end">
                  {!patient.active && (
                    <button
                      onClick={() => handleActivate(patient.id)}
                      className="p-1.5 rounded bg-[rgba(255,255,255,0.05)] hover:bg-[var(--success-soft)] hover:text-[var(--success)] transition-colors text-[var(--text-muted)]"
                      title="Activate"
                    >
                      <Radio size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/patients/${patient.id}/history`)}
                    className="p-1.5 rounded bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    title="History"
                  >
                    <History size={16} />
                  </button>
                  <button
                    onClick={() => navigate(`/patients/${patient.id}/report`)}
                    className="p-1.5 rounded bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    title="Report"
                  >
                    <FileText size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(patient.id)}
                    className="p-1.5 rounded bg-[rgba(255,255,255,0.05)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] transition-colors text-[var(--text-muted)]"
                    title="Delete Patient"
                  >
                    <Trash2 size={16} />
                  </button>
                  {patient.active && (
                    <button
                      onClick={() => navigate(`/patients/${patient.id}/live`)}
                      className="p-1.5 rounded bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-[var(--bg-deep)] transition-[background,color] text-[var(--accent)]"
                      title="Live Monitoring"
                    >
                      <Activity size={16} />
                    </button>
                  )}
                </div>
              </td>
            </>
          )}
        />
      </Card>
    </div>
  );
};

export default Patients;
