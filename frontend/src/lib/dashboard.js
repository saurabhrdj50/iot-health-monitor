function inferApiBase() {
  const override = process.env.REACT_APP_API_URL?.trim();
  if (override) {
    return override.replace(/\/$/, '');
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:8000';
  }

  const { protocol, hostname, host, port } = window.location;
  if (port === '3000' || port === '5173') {
    return `${protocol}//${hostname}:8000`;
  }

  return `${protocol}//${host}`;
}

export const API_BASE = inferApiBase();
export const WS_BASE = API_BASE.replace(/^http/, 'ws');

export const emptyDashboard = {
  patient: null,
  latest: null,
  history: [],
  source: 'waiting_for_data',
  model_loaded: false,
  updated_at: null,
  monitoring_patient_id: null,
  feedback_summary: {},
};

export const initialPatientForm = {
  name: '',
  age: '',
  dob: '',
  admitted: '',
  doctor: '',
  room: '',
  notes: '',
};

export const themeModes = [
  { key: 'command', label: 'Command', description: 'High-contrast mission control surfaces' },
  { key: 'clinical', label: 'Clinical', description: 'Cooler and calmer diagnostic palette' },
  { key: 'night-watch', label: 'Night Watch', description: 'Deeper night-shift monitoring mode' },
];

export const cardMotion = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function formatDateTime(value) {
  if (!value) return 'Waiting for live telemetry';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function formatReading(value, digits = 0) {
  if (value === null || value === undefined) return '--';
  return typeof value === 'number' ? value.toFixed(digits) : value;
}

export function getRiskTone(prediction) {
  if (prediction === 'Risk') return 'critical';
  if (prediction === 'Stress') return 'watch';
  return 'stable';
}

function average(values) {
  const filtered = values.filter((value) => typeof value === 'number' && !Number.isNaN(value));
  if (!filtered.length) return null;
  return filtered.reduce((total, value) => total + value, 0) / filtered.length;
}

function getMetricDelta(history, key) {
  if (history.length < 2) return null;
  const first = history[0]?.[key];
  const last = history[history.length - 1]?.[key];
  if (typeof first !== 'number' || typeof last !== 'number') return null;
  return last - first;
}

export function buildAlerts(dashboard) {
  const latest = dashboard.latest;
  if (!latest) return [];

  const alerts = [];
  if (latest.prediction === 'Risk') {
    alerts.push({
      id: 'critical-state',
      title: 'Critical physiology detected',
      body: 'Immediate bedside review recommended. Risk state is active on the latest telemetry sample.',
      tone: 'critical',
    });
  }
  if (latest.spo2 < 95) {
    alerts.push({
      id: 'spo2-low',
      title: 'Oxygen saturation below target',
      body: `SpO2 is ${Math.round(latest.spo2)}%. Consider airway, probe placement, and escalation thresholds.`,
      tone: 'watch',
    });
  }
  if (latest.heart_rate > 100 || latest.heart_rate < 60) {
    alerts.push({
      id: 'heart-rate-band',
      title: 'Heart rate outside preferred band',
      body: `Heart rate is ${Math.round(latest.heart_rate)} BPM on the active patient feed.`,
      tone: 'watch',
    });
  }
  if (latest.body_temperature && latest.body_temperature > 37.5) {
    alerts.push({
      id: 'temp-high',
      title: 'Body temperature elevated',
      body: `Temperature reached ${latest.body_temperature.toFixed(1)} deg C. Verify context and infection indicators.`,
      tone: 'watch',
    });
  }
  if (!alerts.length) {
    alerts.push({
      id: 'stable-monitoring',
      title: 'Monitoring stable',
      body: 'Vitals are inside the current baseline envelope and no major anomaly trigger is active.',
      tone: 'stable',
    });
  }
  return alerts;
}

export function buildInsights(history, latest, patient) {
  if (!latest || history.length < 2) {
    return [
      { label: 'Trend Insight', value: 'Waiting for more samples' },
      { label: 'Care Suggestion', value: 'Collect 2+ readings to unlock trend analysis' },
      { label: 'Shift Handoff', value: patient?.notes || 'Add notes for the next clinician handoff' },
      { label: 'Monitoring State', value: 'Standby until telemetry stream stabilizes' },
    ];
  }

  const recentWindow = history.slice(-5);
  const hrDelta = Math.round(getMetricDelta(history, 'heart_rate') || 0);
  const spo2Delta = Math.round(getMetricDelta(history, 'spo2') || 0);
  const tempDeltaRaw = getMetricDelta(history, 'body_temperature') || 0;
  const tempDelta = tempDeltaRaw.toFixed(1);
  const recentSpo2Average = average(recentWindow.map((item) => item.spo2));
  const recentRespAverage = average(recentWindow.map((item) => item.respiratory_rate));
  const anomalyCount = recentWindow.filter((item) => item.anomaly_flag).length;

  let recommendation = 'Trends are within the expected envelope for the recent observation window.';
  if (spo2Delta <= -2 || (recentSpo2Average !== null && recentSpo2Average < 95)) {
    recommendation = 'SpO2 is declining across recent readings. Check airway support, probe quality, and escalation criteria.';
  } else if (hrDelta >= 12) {
    recommendation = 'Heart rate is trending upward. Reassess pain, exertion, and hemodynamic stability.';
  } else if (recentRespAverage !== null && recentRespAverage > 20) {
    recommendation = 'Respiratory rate remains elevated. Review work of breathing and oxygenation response.';
  } else if (anomalyCount >= 2) {
    recommendation = 'Repeated anomaly flags detected. Consider closer observation and device placement verification.';
  }

  return [
    {
      label: 'Heart Trend',
      value: `${hrDelta >= 0 ? '+' : ''}${hrDelta} BPM over ${history.length} samples`,
    },
    {
      label: 'Oxygen Trend',
      value: `${spo2Delta >= 0 ? '+' : ''}${spo2Delta}% saturation change`,
    },
    {
      label: 'Temperature Drift',
      value: `${tempDeltaRaw >= 0 ? '+' : ''}${tempDelta} deg C shift from earliest reading`,
    },
    {
      label: 'Care Suggestion',
      value: recommendation,
    },
  ];
}

export function buildRecommendations(history, latest) {
  if (!latest || history.length < 3) {
    return [
      { id: 'warmup', title: 'Trend engine warming up', body: 'Three or more readings unlock stronger comparative recommendations.', tone: 'stable' },
    ];
  }

  const recent = history.slice(-5);
  const spo2Average = average(recent.map((item) => item.spo2));
  const hrAverage = average(recent.map((item) => item.heart_rate));
  const respAverage = average(recent.map((item) => item.respiratory_rate));
  const recommendations = [];

  if (spo2Average !== null && spo2Average < 95) {
    recommendations.push({
      id: 'spo2-decline',
      title: 'Oxygen support review suggested',
      body: `Recent SpO2 average is ${Math.round(spo2Average)}%. Verify airway support and sensor placement.`,
      tone: 'watch',
    });
  }
  if (hrAverage !== null && hrAverage > 100) {
    recommendations.push({
      id: 'hr-rising',
      title: 'Heart rate remains elevated',
      body: `Recent heart-rate average is ${Math.round(hrAverage)} BPM. Reassess pain, exertion, and volume status.`,
      tone: 'watch',
    });
  }
  if (respAverage !== null && respAverage > 20) {
    recommendations.push({
      id: 'resp-elevated',
      title: 'Respiratory burden check',
      body: `Respiratory rate averages ${respAverage.toFixed(1)} /min. Review work of breathing and oxygen response.`,
      tone: 'watch',
    });
  }
  if (latest.prediction === 'Risk') {
    recommendations.push({
      id: 'risk-state',
      title: 'Escalate bedside review',
      body: 'Current AI state is Risk. Confirm status in person and prepare escalation workflow.',
      tone: 'critical',
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: 'stable-window',
      title: 'Recent window is stable',
      body: 'No strong intervention suggestion triggered from the current trend window.',
      tone: 'stable',
    });
  }

  return recommendations;
}

export function buildReportRows(history) {
  return history.map((row) => {
    const date = new Date(row.timestamp);
    return [
      Number.isNaN(date.getTime()) ? row.timestamp : date.toLocaleString(),
      Math.round(row.heart_rate).toString(),
      `${Math.round(row.spo2)}%`,
      row.body_temperature !== null && row.body_temperature !== undefined ? `${row.body_temperature.toFixed(1)} deg C` : '-',
      row.respiratory_rate.toFixed(1),
      row.prediction || 'Unknown',
    ];
  });
}

export function buildTimeline({ dashboard, patient, alerts, activity = [] }) {
  const items = [];
  if (patient) {
    items.push({
      id: `patient-${patient.id}`,
      title: `${patient.name} is the active monitored patient`,
      body: `Room ${patient.room || 'pending'} | ${patient.doctor || 'doctor unassigned'}`,
      tone: patient.active ? 'stable' : 'watch',
      timestamp: patient.admitted || patient.created_at,
    });
  }
  if (dashboard.updated_at) {
    items.push({
      id: 'latest-ingest',
      title: 'Latest telemetry synced',
      body: `Device source: ${dashboard.source === 'device' ? 'ThingSpeak live feed' : 'manual or waiting state'}`,
      tone: 'stable',
      timestamp: dashboard.updated_at,
    });
  }
  if (dashboard.feedback_summary?.total_feedback) {
    items.push({
      id: 'feedback-summary',
      title: 'Clinician feedback available',
      body: `${dashboard.feedback_summary.total_feedback} validations captured for model review`,
      tone: 'watch',
      timestamp: dashboard.updated_at,
    });
  }
  alerts.slice(0, 2).forEach((alert, index) => {
    items.push({
      id: `alert-${alert.id}-${index}`,
      title: alert.title,
      body: alert.body,
      tone: alert.tone,
      timestamp: dashboard.updated_at,
    });
  });

  return [...activity, ...items]
    .filter(Boolean)
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
}

export function buildKpis(latest) {
  return [
    { key: 'heart_rate', label: 'Heart Rate', value: latest?.heart_rate, unit: 'BPM', digits: 0, tone: latest?.heart_rate > 100 || latest?.heart_rate < 60 ? 'alert' : 'normal' },
    { key: 'spo2', label: 'Blood Oxygen', value: latest?.spo2, unit: '%', digits: 0, tone: latest?.spo2 < 95 ? 'alert' : 'normal' },
    { key: 'body_temperature', label: 'Temperature', value: latest?.body_temperature, unit: 'deg C', digits: 1, tone: latest?.body_temperature > 37.5 ? 'alert' : 'normal' },
    { key: 'respiratory_rate', label: 'Respiration', value: latest?.respiratory_rate, unit: '/min', digits: 1, tone: latest?.respiratory_rate > 20 || latest?.respiratory_rate < 12 ? 'alert' : 'normal' },
  ];
}

export function buildDeviceDiagnostics({ latest, dashboard, health, overviewPatients }) {
  const streamCount = overviewPatients.filter((patient) => patient.latest_timestamp).length;
  const sourceLabel = dashboard.source === 'device' ? 'ThingSpeak device stream' : 'Manual or standby source';
  const signalQuality = latest
    ? latest.anomaly_flag
      ? 'Degraded'
      : latest.prediction === 'Risk'
        ? 'Elevated load'
        : 'Nominal'
    : 'Waiting';

  return [
    { label: 'Connectivity', value: health.status === 'healthy' ? 'Backend online' : 'Offline fallback' },
    { label: 'Signal quality', value: signalQuality },
    { label: 'Data source', value: sourceLabel },
    { label: 'Ward streams', value: `${streamCount} active feeds` },
  ];
}

export function buildHandoffSummary({ patient, latest, insights, alerts, noteDraft }) {
  if (!patient) {
    return {
      headline: 'No active patient selected',
      summary: 'Select a patient to generate a clinician handoff summary.',
      bullets: [],
    };
  }

  const leadInsight = insights.find((item) => item.label === 'Care Suggestion')?.value || 'No recommendation yet.';
  const keyAlert = alerts[0]?.title || 'No active alerts.';
  return {
    headline: `${patient.name} handoff brief`,
    summary: `${patient.name} is currently in a ${latest?.prediction || 'standby'} monitoring state. ${leadInsight}`,
    bullets: [
      `Priority alert: ${keyAlert}`,
      `Room ${patient.room || 'pending'} under ${patient.doctor || 'unassigned clinician'}`,
      noteDraft || patient.notes || 'No additional bedside note has been saved yet.',
    ],
  };
}

export function buildWardZones(overviewPatients) {
  const grouped = overviewPatients.reduce((acc, patient) => {
    const zoneKey = patient.room ? `Room ${String(patient.room).charAt(0)}` : 'Unassigned';
    if (!acc[zoneKey]) acc[zoneKey] = [];
    acc[zoneKey].push(patient);
    return acc;
  }, {});

  return Object.entries(grouped).map(([zone, patients]) => ({
    zone,
    patients,
  }));
}

export function buildReferenceKpis(latest) {
  return [
    {
      key: 'heart_rate',
      label: 'Heart Rate',
      subtitle: 'Beats per minute',
      value: latest?.heart_rate,
      unit: 'BPM',
      digits: 0,
      tone: latest?.heart_rate > 100 || latest?.heart_rate < 60 ? 'alert' : 'normal',
      status: latest?.heart_rate > 100 || latest?.heart_rate < 60 ? 'ACTIVE' : 'NORMAL',
      accent: 'pink',
      scaleMin: 60,
      scaleMax: 180,
    },
    {
      key: 'spo2',
      label: 'SpO2 Oxygen',
      subtitle: 'Blood oxygen',
      value: latest?.spo2,
      unit: '%',
      digits: 0,
      tone: latest?.spo2 < 95 ? 'alert' : 'normal',
      status: latest?.spo2 < 95 ? 'LOW' : 'NORMAL',
      accent: 'pink',
      scaleMin: 70,
      scaleMax: 100,
    },
    {
      key: 'body_temperature',
      label: 'Temperature',
      subtitle: 'Body temperature',
      value: latest?.body_temperature,
      unit: 'deg C',
      digits: 1,
      tone: latest?.body_temperature > 37.5 ? 'alert' : 'normal',
      status: latest?.body_temperature > 37.5 ? 'HIGH' : 'NORMAL',
      accent: 'blue',
      scaleMin: 35,
      scaleMax: 40,
    },
    {
      key: 'gsr',
      label: 'Skin Conductance (GSR)',
      subtitle: 'Galvanic skin response',
      value: latest?.gsr,
      unit: 'uS',
      digits: 1,
      tone: latest?.gsr > 30 ? 'alert' : 'normal',
      status: latest?.gsr > 30 ? 'ACTIVE' : 'NORMAL',
      accent: 'pink',
      scaleMin: 0,
      scaleMax: 100,
    },
  ];
}
