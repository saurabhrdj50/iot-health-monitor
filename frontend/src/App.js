import React, { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, BellRing, Download, FileText, Loader2, Radio, Settings, ShieldAlert, UserCog, Users } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import AdminControlsPanel from './components/dashboard/AdminControlsPanel';
import AlertsPanel from './components/dashboard/AlertsPanel';
import DecisionSupportPanel from './components/dashboard/DecisionSupportPanel';
import EventTimeline from './components/dashboard/EventTimeline';
import HandoffSummaryPanel from './components/dashboard/HandoffSummaryPanel';
import HeroPanel from './components/dashboard/HeroPanel';
import InsightsPanel from './components/dashboard/InsightsPanel';
import KpiCard from './components/dashboard/KpiCard';
import NotesPanel from './components/dashboard/NotesPanel';
import PatientSidebar from './components/dashboard/PatientSidebar';
import RecommendationsPanel from './components/dashboard/RecommendationsPanel';
import TelemetryChartPanel from './components/dashboard/TelemetryChartPanel';
import TelemetryTable from './components/dashboard/TelemetryTable';
import TopStrip from './components/dashboard/TopStrip';
import WardMapPanel from './components/dashboard/WardMapPanel';
import WardOverviewPanel from './components/dashboard/WardOverviewPanel';
import ConfirmModal from './components/ui/ConfirmModal';
import { KpiSkeletons, PanelSkeleton } from './components/ui/Skeletons';
import ToastStack from './components/ui/ToastStack';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import {
  API_BASE,
  WS_BASE,
  buildAlerts,
  buildDeviceDiagnostics,
  buildHandoffSummary,
  buildInsights,
  buildReferenceKpis,
  buildRecommendations,
  buildReportRows,
  buildTimeline,
  buildWardZones,
  cardMotion,
  emptyDashboard,
  formatDate,
  getRiskTone,
  initialPatientForm,
  themeModes,
} from './lib/dashboard';

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { detail: await response.text() };

  if (!response.ok) {
    throw new Error(
      payload.detail ||
      payload.error ||
      payload.message ||
      `Request failed with status ${response.status}`
    );
  }

  return payload;
}

function pushToast(setToasts, tone, title, body = '') {
  const id = `${Date.now()}-${Math.random()}`;
  setToasts((current) => [...current, { id, tone, title, body }]);
  window.setTimeout(() => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, 3800);
}

function getRouteFromHash() {
  const raw = window.location.hash.replace('#/', '').trim();
  return raw || 'dashboard';
}

export default function App() {
  const [patients, setPatients] = useState([]);
  const [overviewPatients, setOverviewPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [health, setHealth] = useState({ status: 'unknown', realtime_status: 'checking', telemetry_polling: false });
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [feedbackState, setFeedbackState] = useState({ sending: false, sent: false });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdmitForm, setShowAdmitForm] = useState(false);
  const [patientForm, setPatientForm] = useState(initialPatientForm);
  const [savingPatient, setSavingPatient] = useState(false);
  const [savingManagedPatient, setSavingManagedPatient] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [resetting, setResetting] = useState(false);
  const [metric, setMetric] = useState('heart_rate');
  const [compareMode, setCompareMode] = useState(false);
  const [compareMetric, setCompareMetric] = useState('spo2');
  const [themeMode, setThemeMode] = useState('command');
  const [toasts, setToasts] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [route, setRoute] = useState(() => getRouteFromHash());
  const [activityLog, setActivityLog] = useState([]);
  const [managePatientForm, setManagePatientForm] = useState(initialPatientForm);

  const selectedPatient =
    patients.find((patient) => patient.id === selectedPatientId) ||
    dashboard.patient ||
    patients.find((patient) => patient.active) ||
    null;

  const pushActivity = useCallback((entry) => {
    setActivityLog((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        ...entry,
      },
      ...current,
    ].slice(0, 20));
  }, []);

  useEffect(() => {
    setNoteDraft(selectedPatient?.notes || '');
    setManagePatientForm({
      name: selectedPatient?.name || '',
      age: selectedPatient?.age ?? '',
      dob: selectedPatient?.dob || '',
      admitted: selectedPatient?.admitted || '',
      doctor: selectedPatient?.doctor || '',
      room: selectedPatient?.room || '',
      notes: selectedPatient?.notes || '',
    });
  }, [selectedPatient?.id, selectedPatient?.notes, selectedPatient?.name, selectedPatient?.age, selectedPatient?.dob, selectedPatient?.admitted, selectedPatient?.doctor, selectedPatient?.room]);

  const filteredPatients = useMemo(() => {
    const query = deferredSearch.toLowerCase();
    return patients.filter((patient) => {
      const haystack = `${patient.name} ${patient.room || ''} ${patient.doctor || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [patients, deferredSearch]);

  const latest = dashboard.latest;
  const history = useMemo(() => {
    return dashboard.history.map((item) => ({
      ...item,
      timeLabel: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));
  }, [dashboard.history]);

  const alerts = useMemo(() => buildAlerts(dashboard), [dashboard]);
  const insights = useMemo(() => buildInsights(dashboard.history, latest, selectedPatient), [dashboard.history, latest, selectedPatient]);
  const recommendations = useMemo(() => buildRecommendations(dashboard.history, latest), [dashboard.history, latest]);
  const timelineItems = useMemo(() => buildTimeline({ dashboard, patient: selectedPatient, alerts, activity: activityLog }), [dashboard, selectedPatient, alerts, activityLog]);
  const kpis = useMemo(() => buildReferenceKpis(latest), [latest]);
  const diagnostics = useMemo(() => buildDeviceDiagnostics({ latest, dashboard, health, overviewPatients }), [latest, dashboard, health, overviewPatients]);
  const handoffSummary = useMemo(() => buildHandoffSummary({ patient: selectedPatient, latest, insights, alerts, noteDraft }), [selectedPatient, latest, insights, alerts, noteDraft]);
  const wardZones = useMemo(() => buildWardZones(overviewPatients), [overviewPatients]);
  const activeTone = getRiskTone(latest?.prediction);
  const backendConnected = health.status === 'healthy';
  const connectionMessage = backendConnected
    ? (latest ? 'Backend connected and patient telemetry is live.' : 'Backend connected. Waiting for the next telemetry sample.')
    : `Backend unavailable at ${API_BASE}. Start the API or update REACT_APP_API_URL.`;
  const wardRiskBanner = useMemo(() => {
    const criticalPatients = overviewPatients
      .filter((p) => p.latest_prediction === 'Risk')
      .map((p) => ({ id: p.id, name: p.name, room: p.room }));
    const stressPatients = overviewPatients
      .filter((p) => p.latest_prediction === 'Stress')
      .map((p) => ({ id: p.id, name: p.name, room: p.room }));
    return { critical: criticalPatients, stress: stressPatients };
  }, [overviewPatients]);

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const fetchHealth = useCallback(async () => {
    return requestJson('/api/v1/health');
  }, []);

  const loadPatients = useCallback(async () => {
    const data = await requestJson('/api/v1/patients');
    setPatients(data.patients || []);
    setSelectedPatientId((current) => current || data.active_patient_id || data.patients?.[0]?.id || null);
    return data;
  }, []);

  const loadOverview = useCallback(async () => {
    const data = await requestJson('/api/v1/patients/overview');
    setOverviewPatients(data.patients || []);
  }, []);

  const loadDashboard = useCallback(async (patientId, { silent = false } = {}) => {
    if (!patientId) return;
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [dashboardRes, healthData] = await Promise.all([
        requestJson(`/api/v1/dashboard?limit=24&patient_id=${patientId}`),
        fetchHealth(),
      ]);
      const dashboardData = dashboardRes;
      setDashboard({
        patient: dashboardData.patient,
        latest: dashboardData.latest,
        history: dashboardData.history || [],
        source: dashboardData.source,
        model_loaded: dashboardData.model_loaded,
        updated_at: dashboardData.updated_at,
        monitoring_patient_id: dashboardData.monitoring_patient_id,
        feedback_summary: dashboardData.feedback_summary || {},
      });
      setHealth((current) => ({
        ...current,
        ...healthData,
        status: 'healthy',
      }));
      setErrorMessage('');
    } catch (error) {
      setHealth((current) => ({
        ...current,
        status: 'offline',
        realtime_status: current.realtime_status === 'connected' ? 'degraded' : current.realtime_status,
      }));
      setErrorMessage(error.message || 'Unable to reach the monitoring API right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchHealth]);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const patientData = await loadPatients();
        await loadOverview();
        const patientId = patientData.active_patient_id || patientData.patients?.[0]?.id;
        if (mounted && patientId) {
          setSelectedPatientId(patientId);
          await loadDashboard(patientId);
        } else if (mounted) {
          const healthData = await fetchHealth();
          setHealth((current) => ({
            ...current,
            ...healthData,
            status: 'healthy',
          }));
          setDashboard(emptyDashboard);
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(error.message || 'Unable to initialize dashboard.');
          setHealth((current) => ({ ...current, status: 'offline' }));
          setLoading(false);
        }
      }
    };
    bootstrap();
    return () => {
      mounted = false;
    };
  }, [fetchHealth, loadDashboard, loadOverview, loadPatients]);

  useEffect(() => {
    if (!selectedPatientId) return;
    loadDashboard(selectedPatientId, { silent: true });
    const interval = setInterval(() => {
      loadDashboard(selectedPatientId, { silent: true });
      loadOverview().catch(() => {});
    }, 30000);
    const ws = new WebSocket(`${WS_BASE}/ws`);
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('PING');
      }
    }, 12000);
    ws.onopen = () => {
      setHealth((current) => ({ ...current, realtime_status: 'connected' }));
    };
    ws.onmessage = (event) => {
      if (event.data === 'NEW_DATA') {
        loadDashboard(selectedPatientId, { silent: true });
        loadOverview().catch(() => {});
      }
    };
    ws.onerror = () => {
      setHealth((current) => ({ ...current, realtime_status: 'degraded' }));
    };
    ws.onclose = () => {
      setHealth((current) => ({ ...current, realtime_status: 'disconnected' }));
    };
    return () => {
      clearInterval(interval);
      clearInterval(pingInterval);
      ws.close();
    };
  }, [selectedPatientId, loadDashboard, loadOverview]);

  useEffect(() => {
    if (dashboard.latest?.prediction !== 'Risk') return;
    try {
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (error) {}
  }, [dashboard.latest?.prediction]);

  const handleSelectPatient = (patientId) => {
    startTransition(() => setSelectedPatientId(patientId));
    const patient = patients.find((item) => item.id === patientId);
    if (patient) {
      pushActivity({
        title: 'Patient switched',
        body: `${patient.name} is now the focus of the active workspace.`,
        tone: 'stable',
      });
      pushToast(setToasts, 'info', 'Patient switched', `Now monitoring ${patient.name}.`);
    }
  };

  const handleActivatePatient = async () => {
    if (!selectedPatientId) return;
    try {
      await requestJson(`/api/v1/patients/${selectedPatientId}/activate`, { method: 'POST' });
      const patientData = await loadPatients();
      const activeId = patientData.active_patient_id || selectedPatientId;
      setSelectedPatientId(activeId);
      await Promise.all([loadDashboard(activeId), loadOverview()]);
      pushToast(setToasts, 'success', 'Monitoring route updated', 'Live device telemetry now targets the selected patient.');
    } catch (error) {
      pushToast(setToasts, 'error', 'Could not activate patient', error.message);
    }
  };

  const handleFeedback = async (accurate) => {
    if (!dashboard.latest) return;
    setFeedbackState({ sending: true, sent: false });
    try {
      await requestJson('/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accurate,
          patient_id: selectedPatientId,
          snapshot_id: dashboard.latest.id,
          prediction: dashboard.latest.prediction,
          metrics: {
            heart_rate: dashboard.latest.heart_rate,
            spo2: dashboard.latest.spo2,
            respiratory_rate: dashboard.latest.respiratory_rate,
            body_temperature: dashboard.latest.body_temperature,
          },
          timestamp: new Date().toISOString(),
        }),
      });
      setFeedbackState({ sending: false, sent: true });
      await loadDashboard(selectedPatientId, { silent: true });
      pushToast(setToasts, 'success', 'Feedback saved', 'The AI validation has been stored for future review.');
      window.setTimeout(() => setFeedbackState({ sending: false, sent: false }), 3500);
    } catch (error) {
      setFeedbackState({ sending: false, sent: false });
      pushToast(setToasts, 'error', 'Feedback failed', 'Unable to store the feedback right now.');
    }
  };

  const handleAdmitPatient = async (event) => {
    event.preventDefault();
    setSavingPatient(true);
    try {
      const payload = { ...patientForm, age: patientForm.age ? Number(patientForm.age) : null };
      const admitted = await requestJson('/api/v1/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setPatientForm(initialPatientForm);
      setShowAdmitForm(false);
      await Promise.all([loadPatients(), loadOverview()]);
      setSelectedPatientId(admitted.id);
      await loadDashboard(admitted.id, { silent: true });
      pushToast(setToasts, 'success', 'Patient admitted', 'The new patient has been added to the roster.');
    } catch (error) {
      pushToast(setToasts, 'error', 'Admit failed', error.message);
    } finally {
      setSavingPatient(false);
    }
  };

  const handleManagePatientSave = async (event) => {
    event.preventDefault();
    if (!selectedPatient) return;
    setSavingManagedPatient(true);
    try {
      const payload = {
        ...managePatientForm,
        age: managePatientForm.age ? Number(managePatientForm.age) : null,
      };
      await requestJson(`/api/v1/patients/${selectedPatient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await Promise.all([loadPatients(), loadOverview(), loadDashboard(selectedPatient.id, { silent: true })]);
      pushToast(setToasts, 'success', 'Patient updated', 'Patient details were saved successfully.');
      pushActivity({
        title: 'Patient profile updated',
        body: `${managePatientForm.name || selectedPatient.name} details were updated.`,
        tone: 'stable',
      });
    } catch (error) {
      pushToast(setToasts, 'error', 'Update failed', error.message);
    } finally {
      setSavingManagedPatient(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedPatient) return;
    setSavingNotes(true);
    try {
      await requestJson(`/api/v1/patients/${selectedPatient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: noteDraft }),
      });
      await Promise.all([loadPatients(), loadOverview(), loadDashboard(selectedPatient.id, { silent: true })]);
      pushToast(setToasts, 'success', 'Note saved', 'The shift handoff note was updated.');
    } catch (error) {
      pushToast(setToasts, 'error', 'Save failed', error.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleReset = async () => {
    if (!adminToken || !selectedPatientId) return;
    setResetting(true);
    try {
      await requestJson(`/api/v1/reset?patient_id=${selectedPatientId}`, {
        method: 'POST',
        headers: { 'x-admin-token': adminToken },
      });
      await Promise.all([loadDashboard(selectedPatientId), loadOverview()]);
      setShowResetConfirm(false);
      pushToast(setToasts, 'success', 'Telemetry reset', 'Stored readings for the selected patient were cleared.');
      pushActivity({
        title: 'Telemetry reset performed',
        body: `${selectedPatient?.name || 'Selected patient'} history was cleared.`,
        tone: 'critical',
      });
    } catch (error) {
      pushToast(setToasts, 'error', 'Reset failed', error.message);
    } finally {
      setResetting(false);
    }
  };

  const handleExportPDF = () => {
    if (!dashboard.history.length || !selectedPatient) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const reportRows = buildReportRows(dashboard.history);

    doc.setFillColor(7, 19, 26);
    doc.rect(0, 0, pageWidth, 32, 'F');
    doc.setTextColor(244, 247, 250);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('Pulse Command Center', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Patient telemetry intelligence report', pageWidth - 68, 20);

    doc.setTextColor(25, 37, 54);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Patient Overview', 14, 46);
    doc.setLineWidth(0.4);
    doc.setDrawColor(196, 205, 214);
    doc.line(14, 48, pageWidth - 14, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${selectedPatient.name}`, 14, 56);
    doc.text(`Patient ID: ${selectedPatient.id}`, 14, 62);
    doc.text(`DOB: ${formatDate(selectedPatient.dob)}`, 14, 68);
    doc.text(`Room: ${selectedPatient.room || 'N/A'}`, 14, 74);
    doc.text(`Doctor: ${selectedPatient.doctor || 'N/A'}`, pageWidth - 78, 56);
    doc.text(`Admitted: ${formatDate(selectedPatient.admitted)}`, pageWidth - 78, 62);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 78, 68);
    doc.text(`Current Phase: ${dashboard.latest?.prediction || 'Unknown'}`, pageWidth - 78, 74);

    autoTable(doc, {
      startY: 88,
      head: [['Timestamp', 'HR (BPM)', 'SpO2', 'Temp', 'Resp (/min)', 'Prediction']],
      body: reportRows.reverse(),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3.5, font: 'helvetica' },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: () => {
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text('Confidential patient telemetry report', 14, pageHeight - 10);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - 26, pageHeight - 10);
      },
    });

    doc.save(`${selectedPatient.name.replace(/\s+/g, '_')}_telemetry_report.pdf`);
    pushToast(setToasts, 'info', 'Report exported', 'The patient telemetry report was generated as a PDF.');
  };

  const dismissToast = (toastId) => setToasts((current) => current.filter((toast) => toast.id !== toastId));

  const toggleAlertAck = useCallback((alertId) => {
    setAcknowledgedAlerts((current) => current.includes(alertId) ? current.filter((id) => id !== alertId) : [...current, alertId]);
  }, []);

  const navigate = (nextRoute) => {
    window.location.hash = `/${nextRoute}`;
    setRoute(nextRoute);
  };

  useKeyboardShortcuts({
    d: () => navigate('dashboard'),
    w: () => navigate('ward'),
    r: () => navigate('reports'),
    s: () => navigate('settings'),
    '/': () => {
      const searchInput = document.getElementById('patient-search');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    },
    '1': () => { if (filteredPatients[0]) handleSelectPatient(filteredPatients[0].id); },
    '2': () => { if (filteredPatients[1]) handleSelectPatient(filteredPatients[1].id); },
    '3': () => { if (filteredPatients[2]) handleSelectPatient(filteredPatients[2].id); },
    '4': () => { if (filteredPatients[3]) handleSelectPatient(filteredPatients[3].id); },
    '5': () => { if (filteredPatients[4]) handleSelectPatient(filteredPatients[4].id); },
    '6': () => { if (filteredPatients[5]) handleSelectPatient(filteredPatients[5].id); },
    '7': () => { if (filteredPatients[6]) handleSelectPatient(filteredPatients[6].id); },
    '8': () => { if (filteredPatients[7]) handleSelectPatient(filteredPatients[7].id); },
    '9': () => { if (filteredPatients[8]) handleSelectPatient(filteredPatients[8].id); },
  });

  const dashboardPage = (
    <>
      <motion.div variants={cardMotion}>
        <HeroPanel
          patient={selectedPatient}
          latest={latest}
          health={health}
          apiBase={API_BASE}
          onActivate={handleActivatePatient}
          onRefresh={() => loadDashboard(selectedPatientId, { silent: true })}
          onExport={handleExportPDF}
          refreshing={refreshing}
          canActivate={Boolean(selectedPatientId)}
        />
      </motion.div>

      <motion.div variants={cardMotion}>
        <TopStrip latest={latest} dashboard={dashboard} health={health} />
      </motion.div>

      {loading ? (
        <>
          <KpiSkeletons />
          <div className="dashboard-main-grid">
            <PanelSkeleton height={320} />
            <PanelSkeleton height={320} />
          </div>
        </>
      ) : !latest ? (
        <motion.section className="empty-state-panel gradient-border" variants={cardMotion}>
          <p className="eyebrow">Telemetry standby</p>
          <h3>Waiting for patient readings</h3>
          <p className="panel-copy">
            {backendConnected
              ? 'The dashboard is connected. Route the live device feed to a patient or send a telemetry sample to unlock charts and recommendations.'
              : connectionMessage}
          </p>
          <div className="empty-state-actions">
            <button className="primary-button" onClick={() => loadDashboard(selectedPatientId, { silent: true })}>
              Refresh connection
            </button>
            <button className="secondary-button" onClick={handleActivatePatient} disabled={!selectedPatientId}>
              Route selected patient
            </button>
          </div>
        </motion.section>
      ) : (
        <>
          <motion.section className="kpi-grid dashboard-kpi-grid" variants={cardMotion}>
            {kpis.map((kpi) => <KpiCard key={kpi.key} kpi={kpi} history={dashboard.history} />)}
          </motion.section>

          <section className="dashboard-main-grid">
            <motion.div variants={cardMotion} className="tilt-card gradient-border">
              <TelemetryChartPanel
                history={history}
                loading={loading}
                selectedMetric={metric}
                onSelectMetric={(nextMetric) => {
                  setMetric(nextMetric);
                  if (nextMetric === compareMetric) setCompareMetric(nextMetric === 'heart_rate' ? 'spo2' : 'heart_rate');
                }}
                compareMetric={compareMetric}
                onCompareMetricChange={setCompareMetric}
                compareMode={compareMode}
                onToggleCompareMode={() => setCompareMode((value) => !value)}
              />
            </motion.div>
            <motion.div variants={cardMotion}>
              <DecisionSupportPanel latest={latest} feedbackSummary={dashboard.feedback_summary} feedbackState={feedbackState} onFeedback={handleFeedback} diagnostics={diagnostics} />
            </motion.div>
          </section>

          <section className="dashboard-support-grid">
            <motion.div variants={cardMotion} className="tilt-card gradient-border">
              <AlertsPanel alerts={alerts} acknowledgedIds={acknowledgedAlerts} onToggleAck={toggleAlertAck} />
            </motion.div>
            <motion.div variants={cardMotion} className="tilt-card gradient-border">
              <RecommendationsPanel recommendations={recommendations} />
            </motion.div>
          </section>

          <section className="dashboard-summary-grid">
            <motion.div variants={cardMotion} className="tilt-card gradient-border">
              <InsightsPanel insights={insights} />
            </motion.div>
            <motion.div variants={cardMotion} className="tilt-card gradient-border">
              <HandoffSummaryPanel summary={handoffSummary} />
            </motion.div>
          </section>
        </>
      )}
    </>
  );

  const wardPage = (
    <>
      <motion.section className="page-header-card gradient-border" variants={cardMotion}>
        <div>
          <p className="eyebrow">Ward Command</p>
          <h2>Multi-Patient Overview</h2>
          <p className="page-copy">Track patient state across the ward, jump between monitoring sessions, and review recent operational events.</p>
        </div>
        <Users className="page-icon" />
      </motion.section>
      <section className="ward-top-grid">
        <motion.div variants={cardMotion} className="tilt-card gradient-border">
          <WardOverviewPanel overviewPatients={overviewPatients} selectedPatientId={selectedPatientId} onSelectPatient={handleSelectPatient} />
        </motion.div>
        <motion.div variants={cardMotion} className="tilt-card gradient-border">
          <WardMapPanel zones={wardZones} selectedPatientId={selectedPatientId} onSelectPatient={handleSelectPatient} />
        </motion.div>
      </section>
      <section className="ward-bottom-grid">
        <motion.div variants={cardMotion} className="tilt-card gradient-border">
          <EventTimeline items={timelineItems} />
        </motion.div>
        <motion.div variants={cardMotion} className="tilt-card gradient-border">
          <AlertsPanel alerts={alerts} acknowledgedIds={acknowledgedAlerts} onToggleAck={toggleAlertAck} />
        </motion.div>
      </section>
    </>
  );

  const reportsPage = (
    <>
      <motion.section className="page-header-card gradient-border" variants={cardMotion}>
        <div>
          <p className="eyebrow">Reports Hub</p>
          <h2>Exports and Historical Review</h2>
          <p className="page-copy">Generate patient reports, inspect telemetry history, and review model validation activity in one place.</p>
        </div>
        <FileText className="page-icon" />
      </motion.section>
      <motion.section className="route-summary-strip" variants={cardMotion}>
        <div className="route-summary-card gradient-border">
          <span>Report scope</span>
          <strong>{selectedPatient ? selectedPatient.name : 'No active patient'}</strong>
        </div>
        <div className="route-summary-card gradient-border">
          <span>History window</span>
          <strong>{dashboard.history.length} readings</strong>
        </div>
        <div className="route-summary-card gradient-border">
          <span>Validation coverage</span>
          <strong>{dashboard.feedback_summary.total_feedback || 0} feedback items</strong>
        </div>
      </motion.section>
      <section className="reports-top-grid">
        <motion.div className="panel report-summary-panel gradient-border" variants={cardMotion}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Export Actions</p>
              <h3>Patient Report Center</h3>
            </div>
          </div>
          <p className="panel-copy">Build a polished PDF for the active patient including latest diagnosis, telemetry history, and clinician-ready context.</p>
          <button className="primary-button ripple-button shimmer-button" onClick={handleExportPDF} disabled={!dashboard.history.length}>
            <Download className="h-4 w-4" />
            Export patient PDF
          </button>
          <div className="report-mini-stats">
            <div><span>Readings stored</span><strong>{dashboard.history.length}</strong></div>
            <div><span>Feedback entries</span><strong>{dashboard.feedback_summary.total_feedback || 0}</strong></div>
            <div><span>Confidence</span><strong>{latest?.probability ? `${Math.round(Math.max(...Object.values(latest.probability)) * 100)}%` : 'N/A'}</strong></div>
          </div>
        </motion.div>
        <motion.div variants={cardMotion} className="tilt-card gradient-border">
          <HandoffSummaryPanel summary={handoffSummary} />
        </motion.div>
      </section>
      <motion.div variants={cardMotion} className="tilt-card gradient-border reports-table-row">
        <TelemetryTable history={history} />
      </motion.div>
    </>
  );

  const settingsPage = (
    <>
      <motion.section className="page-header-card gradient-border" variants={cardMotion}>
        <div>
          <p className="eyebrow">Workspace Settings</p>
          <h2>Configuration and Clinical Context</h2>
          <p className="page-copy">Manage patients, secure actions, and keep the monitoring session aligned.</p>
        </div>
        <Settings className="page-icon" />
      </motion.section>
      <motion.section className="route-summary-strip" variants={cardMotion}>
        <div className="route-summary-card gradient-border">
          <span>Active clinician</span>
          <strong>{selectedPatient?.doctor || 'Doctor pending'}</strong>
        </div>
        <div className="route-summary-card gradient-border">
          <span>Current room</span>
          <strong>{selectedPatient?.room || 'Room pending'}</strong>
        </div>
        <div className="route-summary-card gradient-border">
          <span>Protected actions</span>
          <strong>Reset + patient management</strong>
        </div>
      </motion.section>
      <section className="settings-main-grid">
        <motion.div variants={cardMotion} className="tilt-card gradient-border settings-notes-card">
          <NotesPanel patient={selectedPatient} noteDraft={noteDraft} onChange={setNoteDraft} onSave={handleSaveNotes} saving={savingNotes} />
        </motion.div>
        <div className="settings-side-stack">
          <motion.div variants={cardMotion} className="tilt-card gradient-border">
            <AdminControlsPanel
              adminToken={adminToken}
              onAdminTokenChange={setAdminToken}
              onOpenResetConfirm={() => setShowResetConfirm(true)}
              resetting={resetting}
              disabled={!selectedPatientId}
            />
          </motion.div>
          <motion.div variants={cardMotion} className="tilt-card gradient-border">
            <div className="panel admin-panel manage-patient-panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Manage Patient</p>
                  <h3>Update Selected Patient</h3>
                </div>
                <UserCog className="h-5 w-5 text-cyan-200" />
              </div>
              <p className="panel-copy">
                Edit the selected patient profile, update assigned room and clinician, and keep bedside context current.
              </p>
              <form className="admit-form manage-patient-form" onSubmit={handleManagePatientSave}>
                <input value={managePatientForm.name} onChange={(e) => setManagePatientForm((current) => ({ ...current, name: e.target.value }))} placeholder="Patient name" required />
                <div className="form-grid">
                  <input value={managePatientForm.age} onChange={(e) => setManagePatientForm((current) => ({ ...current, age: e.target.value }))} placeholder="Age" />
                  <input value={managePatientForm.room} onChange={(e) => setManagePatientForm((current) => ({ ...current, room: e.target.value }))} placeholder="Room" />
                </div>
                <input value={managePatientForm.doctor} onChange={(e) => setManagePatientForm((current) => ({ ...current, doctor: e.target.value }))} placeholder="Attending doctor" />
                <div className="form-grid">
                  <input type="date" value={managePatientForm.dob || ''} onChange={(e) => setManagePatientForm((current) => ({ ...current, dob: e.target.value }))} />
                  <input type="date" value={managePatientForm.admitted || ''} onChange={(e) => setManagePatientForm((current) => ({ ...current, admitted: e.target.value }))} />
                </div>
                <textarea value={managePatientForm.notes} onChange={(e) => setManagePatientForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Patient notes" rows={4} />
                <div className="admin-row manage-patient-actions">
                  <button className="secondary-button" type="button" onClick={handleActivatePatient} disabled={!selectedPatientId}>
                    <Radio className="h-4 w-4" />
                    Route feed here
                  </button>
                  <button className="primary-button" type="submit" disabled={savingManagedPatient || !selectedPatient}>
                    {savingManagedPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}
                    Save patient changes
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </section>
      <section className="settings-handoff-row">
        <motion.div variants={cardMotion} className="tilt-card gradient-border">
          <HandoffSummaryPanel summary={handoffSummary} />
        </motion.div>
      </section>
    </>
  );

  return (
    <div className={`console-shell tone-${activeTone} theme-mode-${themeMode}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="console-aurora console-aurora-left" />
      <div className="console-aurora console-aurora-right" />
      <div className="particles-container" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${8 + Math.random() * 12}s`,
              animationDelay: `${Math.random() * 10}s`,
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
            }}
          />
        ))}
      </div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <ConfirmModal
        open={showResetConfirm}
        title="Reset selected patient telemetry?"
        body="This will remove stored vitals history for the selected patient. Live device ingestion can continue after the reset."
        confirmLabel="Reset telemetry"
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
        busy={resetting}
      />

      <div className="console-grid">
        <div>
          <PatientSidebar
            patients={patients}
            filteredPatients={filteredPatients}
            selectedPatientId={selectedPatientId}
            search={search}
            onSearchChange={setSearch}
            showAdmitForm={showAdmitForm}
            onToggleAdmitForm={() => setShowAdmitForm((value) => !value)}
            patientForm={patientForm}
            onPatientFormChange={(field, value) => setPatientForm((current) => ({ ...current, [field]: value }))}
            onAdmitPatient={handleAdmitPatient}
            savingPatient={savingPatient}
            onSelectPatient={handleSelectPatient}
            health={health}
            dashboard={dashboard}
            overviewPatients={overviewPatients}
            currentRoute={route}
            onNavigate={navigate}
            themeModes={themeModes}
            currentThemeMode={themeMode}
            onThemeModeChange={setThemeMode}
          />
        </div>

        <main id="main-content" className="main-column" tabIndex="-1">
          {errorMessage ? (
            <div
              className="error-banner"
              role="alert"
            >
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
              <button className="error-banner-action" onClick={() => loadDashboard(selectedPatientId, { silent: true })}>
                Retry
              </button>
            </div>
          ) : null}

          <div
            className={`connection-banner ${backendConnected ? 'connection-banner-ok' : 'connection-banner-error'}`}
          >
            <div>
              <strong>{backendConnected ? 'Connection healthy' : 'Connection needs attention'}</strong>
              <p>{connectionMessage}</p>
            </div>
            <button className="secondary-button connection-banner-button" onClick={() => loadDashboard(selectedPatientId, { silent: true })}>
              Sync now
            </button>
          </div>

          <AnimatePresence>
            {(wardRiskBanner.critical.length > 0 || wardRiskBanner.stress.length > 0) && (
              <div
                className="ward-risk-banner"
                role="alert"
              >
                <div className="ward-risk-banner-inner">
                  <ShieldAlert className="h-4 w-4 ward-risk-icon" />
                  <div className="ward-risk-content">
                    {wardRiskBanner.critical.length > 0 && (
                      <div className="ward-risk-row ward-risk-critical">
                        <strong>{wardRiskBanner.critical.length} critical</strong>
                        <span>{wardRiskBanner.critical.map((p) => `${p.name}${p.room ? ` (Room ${p.room})` : ''}`).join(', ')}</span>
                      </div>
                    )}
                    {wardRiskBanner.stress.length > 0 && (
                      <div className="ward-risk-row ward-risk-stress">
                        <strong>{wardRiskBanner.stress.length} under stress</strong>
                        <span>{wardRiskBanner.stress.map((p) => `${p.name}${p.room ? ` (Room ${p.room})` : ''}`).join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <button
                    className="ward-risk-dismiss"
                    onClick={() => {
                      const firstCritical = wardRiskBanner.critical[0];
                      if (firstCritical) handleSelectPatient(firstCritical.id);
                    }}
                  >
                    Review
                  </button>
                </div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
            key={route}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
              {route === 'dashboard' && dashboardPage}
              {route === 'ward' && wardPage}
              {route === 'reports' && reportsPage}
              {route === 'settings' && settingsPage}
            </motion.div>
          </AnimatePresence>

          <div
            className="floating-status"
          >
            <BellRing className="h-4 w-4" />
            <span>
              {refreshing
                ? 'Syncing fresh readings...'
                : backendConnected
                  ? (latest ? 'Live telemetry monitoring active' : 'Waiting for telemetry to arrive')
                  : 'Backend connection lost'}
            </span>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
          </div>
        </main>
      </div>
    </div>
  );
}
