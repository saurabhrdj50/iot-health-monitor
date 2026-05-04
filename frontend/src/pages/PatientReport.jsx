import { useParams } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { useEffect, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import patientService from '../services/patientService';

const PatientReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const dashboard = await patientService.getPatientDashboard(id, { limit: 50 });
        setPatient(dashboard.patient);
      } catch (err) {
        console.error('Failed to load patient:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleExportPDF = () => {
    alert('PDF export functionality - requires jsPDF integration');
  };

  const handleExportCSV = () => {
    alert('CSV export functionality - requires data processing');
  };

  if (loading) return <div className="text-[var(--text-muted)] p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/patients')} className="secondary-button">
          <ArrowLeft size={16} />
          Back
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Patient Report</h1>
      </div>

      <Card title={patient?.name || 'Patient Report'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[var(--text-muted)]">Room</p>
              <p className="text-[var(--text-primary)] font-medium">{patient?.room || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Doctor</p>
              <p className="text-[var(--text-primary)] font-medium">{patient?.doctor || 'Unassigned'}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleExportPDF} className="primary-button">
              <Download size={16} />
              Export PDF
            </button>
            <button onClick={handleExportCSV} className="secondary-button">
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PatientReport;
