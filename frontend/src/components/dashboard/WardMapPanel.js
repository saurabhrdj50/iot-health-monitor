import React from 'react';
import { motion } from 'framer-motion';
import { Map } from 'lucide-react';

const zoneVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.3, ease: 'easeOut' },
  }),
};

export default function WardMapPanel({ zones, selectedPatientId, onSelectPatient }) {
  return (
    <div className="panel gradient-border">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Ward Grid</p>
          <h3>Operational Layout</h3>
        </div>
        <Map className="h-5 w-5" style={{ color: 'var(--accent)' }} />
      </div>
      <div className="ward-zone-grid">
        {zones.map((zone, zoneIndex) => (
          <motion.div
            key={zone.zone}
            className="ward-zone-card"
            variants={zoneVariants}
            initial="hidden"
            animate="visible"
            custom={zoneIndex}
          >
            <div className="ward-zone-head">
              <strong>{zone.zone}</strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{zone.patients.length} patients</span>
            </div>
            <div className="ward-zone-patients">
              {zone.patients.map((patient) => (
                <motion.button
                  key={patient.id}
                  className={`ward-chip ${selectedPatientId === patient.id ? 'ward-chip-active' : ''}`}
                  onClick={() => onSelectPatient(patient.id)}
                  whileHover={{ x: 4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>{patient.name}</span>
                  <small>{patient.latest_prediction || 'No data'}</small>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
