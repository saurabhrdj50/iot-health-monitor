import React from 'react';
import { motion } from 'framer-motion';
import { BedDouble } from 'lucide-react';

const cardVariants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.25, ease: 'easeOut' },
  }),
};

export default function WardOverviewPanel({ overviewPatients, selectedPatientId, onSelectPatient }) {
  const liveCount = overviewPatients.filter((patient) => patient.latest_timestamp).length;
  const criticalCount = overviewPatients.filter((patient) => patient.latest_prediction === 'Risk').length;

  return (
    <div className="panel gradient-border">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Ward Overview</p>
          <h3>Multi-Patient Snapshot</h3>
        </div>
        <BedDouble className="h-5 w-5" style={{ color: 'var(--accent)' }} />
      </div>

      <div className="ward-summary">
        <span>{overviewPatients.length} patients loaded</span>
        <span>{liveCount} streaming now</span>
        {criticalCount > 0 && <span style={{ color: 'var(--danger)' }}>{criticalCount} critical</span>}
      </div>

      <div className="ward-grid">
        {overviewPatients.map((patient, index) => (
          <motion.button
            key={patient.id}
            className={`ward-card ${selectedPatientId === patient.id ? 'ward-card-active' : ''}`}
            onClick={() => onSelectPatient(patient.id)}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={index}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            layout
          >
            <div className="ward-head">
              <strong>{patient.name}</strong>
              <span className={`status-pill ${patient.latest_prediction === 'Risk' ? 'status-bad' : patient.latest_prediction === 'Stress' ? 'status-watch' : 'status-ok'}`}>
                {patient.latest_prediction || 'No data'}
              </span>
            </div>
            <p>{patient.room || 'Room pending'} · {patient.doctor || 'Unassigned'}</p>
            <div className="ward-metrics">
              <span>HR {patient.latest_heart_rate ? Math.round(patient.latest_heart_rate) : '--'}</span>
              <span>SpO2 {patient.latest_spo2 ? Math.round(patient.latest_spo2) : '--'}%</span>
            </div>
          </motion.button>
        ))}
      </div>

      {!overviewPatients.length ? (
        <motion.div
          className="empty-mini empty-panel-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          No ward patients are available yet.
        </motion.div>
      ) : null}
    </div>
  );
}
