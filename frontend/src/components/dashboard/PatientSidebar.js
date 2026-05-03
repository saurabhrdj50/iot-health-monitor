import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cpu, FileText, LayoutDashboard, Loader2, Plus, Radio, Search, Settings, ShieldCheck, Users } from 'lucide-react';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'ward', label: 'Ward', icon: Users },
  { key: 'reports', label: 'Reports', icon: FileText },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const patientCardVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

export default function PatientSidebar({
  patients,
  filteredPatients,
  selectedPatientId,
  search,
  onSearchChange,
  showAdmitForm,
  onToggleAdmitForm,
  patientForm,
  onPatientFormChange,
  onAdmitPatient,
  savingPatient,
  onSelectPatient,
  health,
  dashboard,
  overviewPatients,
  currentRoute,
  onNavigate,
  themeModes = [],
  currentThemeMode,
  onThemeModeChange,
}) {
  const activeAlerts = overviewPatients.filter((patient) => patient.latest_prediction === 'Risk').length;
  const streamingPatients = overviewPatients.filter((patient) => patient.latest_timestamp).length;
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) || null;

  return (
    <aside className="sidebar-panel" aria-label="Patient navigation and roster">
      <motion.div
        className="brand-block"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="brand-badge"><Radio className="h-5 w-5" /></div>
        <div>
          <p className="eyebrow">Live Operations</p>
          <h1>Pulse Command Center</h1>
        </div>
      </motion.div>

      <motion.div
        className="status-tile"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
      >
        <div>
          <p className="eyebrow">System Health</p>
          <strong>{health.status === 'healthy' ? 'Backend Connected' : 'Backend Offline'}</strong>
          <p className="mini-subcopy">
            {dashboard.model_loaded ? 'ML model loaded' : 'Fallback inference active'}
          </p>
        </div>
        <span className={`status-pill ${health.status === 'healthy' ? 'status-ok' : 'status-bad'}`}>
          {health.status === 'healthy' ? 'Online' : 'Offline'}
        </span>
      </motion.div>

      <motion.div
        className="ops-mini-grid"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
      >
        <div className="ops-mini-card">
          <ShieldCheck className="h-4 w-4" />
          <div>
            <span>Critical Alerts</span>
            <strong>{activeAlerts}</strong>
          </div>
        </div>
        <div className="ops-mini-card">
          <Cpu className="h-4 w-4" />
          <div>
            <span>Streaming Patients</span>
            <strong>{streamingPatients}</strong>
          </div>
        </div>
      </motion.div>

        <nav className="sidebar-nav" aria-label="Workspace sections">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.key}
                className={`nav-item neon-glow ${currentRoute === item.key ? 'nav-item-active' : ''}`}
                onClick={() => onNavigate(item.key)}
                aria-current={currentRoute === item.key ? 'page' : undefined}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index, duration: 0.25 }}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </motion.button>
            );
          })}
        </nav>

      <motion.div
        className="sidebar-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.3 }}
      >
        <div className="section-row">
          <div>
            <p className="eyebrow">Visual Mode</p>
            <h2>Command Theme</h2>
          </div>
        </div>
        <div className="theme-mode-grid">
          {themeModes.map((mode) => (
            <motion.button
              key={mode.key}
              className={`theme-mode-card ${currentThemeMode === mode.key ? 'theme-mode-card-active' : ''}`}
              onClick={() => onThemeModeChange(mode.key)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <strong>{mode.label}</strong>
              <span>{mode.description}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="sidebar-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <div className="section-row">
          <div>
            <p className="eyebrow">Patient Directory</p>
            <h2>Assigned Roster</h2>
          </div>
          <motion.button
            className="ghost-button"
            onClick={onToggleAdmitForm}
            aria-expanded={showAdmitForm}
            aria-controls="admit-form"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
          >
            <Plus className="h-4 w-4" />
            Admit
          </motion.button>
        </div>

        <div className="search-shell" role="search">
          <label className="sr-only" htmlFor="patient-search">Search patients</label>
          <Search className="h-4 w-4 text-cyan-200/80" />
          <input
            id="patient-search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search patients, rooms, clinicians"
            aria-label="Search patients, rooms, and clinicians"
          />
        </div>

        <div className="roster-summary" aria-live="polite">
          <span>{filteredPatients.length} visible</span>
          <span>{selectedPatient ? `Focused on ${selectedPatient.name}` : 'Choose a patient to begin'}</span>
        </div>

        <AnimatePresence>
          {showAdmitForm ? (
            <motion.form
              id="admit-form"
              className="admit-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              onSubmit={onAdmitPatient}
              aria-label="Admit patient form"
            >
              <label className="sr-only" htmlFor="patient-name">Patient name</label>
              <input id="patient-name" value={patientForm.name} onChange={(e) => onPatientFormChange('name', e.target.value)} placeholder="Patient name" required />
              <div className="form-grid">
                <div>
                  <label className="sr-only" htmlFor="patient-age">Age</label>
                  <input id="patient-age" value={patientForm.age} onChange={(e) => onPatientFormChange('age', e.target.value)} placeholder="Age" />
                </div>
                <div>
                  <label className="sr-only" htmlFor="patient-room">Room</label>
                  <input id="patient-room" value={patientForm.room} onChange={(e) => onPatientFormChange('room', e.target.value)} placeholder="Room" />
                </div>
              </div>
              <label className="sr-only" htmlFor="patient-doctor">Attending doctor</label>
              <input id="patient-doctor" value={patientForm.doctor} onChange={(e) => onPatientFormChange('doctor', e.target.value)} placeholder="Attending doctor" />
              <div className="form-grid">
                <div>
                  <label className="sr-only" htmlFor="patient-dob">Date of birth</label>
                  <input id="patient-dob" type="date" value={patientForm.dob} onChange={(e) => onPatientFormChange('dob', e.target.value)} />
                </div>
                <div>
                  <label className="sr-only" htmlFor="patient-admitted">Admitted date</label>
                  <input id="patient-admitted" type="date" value={patientForm.admitted} onChange={(e) => onPatientFormChange('admitted', e.target.value)} />
                </div>
              </div>
              <label className="sr-only" htmlFor="patient-notes">Monitoring notes</label>
              <textarea id="patient-notes" value={patientForm.notes} onChange={(e) => onPatientFormChange('notes', e.target.value)} placeholder="Monitoring notes" rows={3} />
              <motion.button
                className="primary-button"
                type="submit"
                disabled={savingPatient}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {savingPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Save Patient
              </motion.button>
            </motion.form>
          ) : null}
        </AnimatePresence>

        <div className="patient-list" role="list" aria-label="Patient roster">
          <AnimatePresence mode="popLayout">
            {filteredPatients.map((patient, index) => {
              const active = patient.id === selectedPatientId;
              const showNumber = index < 9;
              const overviewMatch = overviewPatients.find((op) => op.id === patient.id);
              const riskPrediction = overviewMatch?.latest_prediction || null;
              const riskClass = riskPrediction === 'Risk' ? 'risk-critical' : riskPrediction === 'Stress' ? 'risk-watch' : 'risk-stable';

              return (
                <motion.button
                  layout
                  key={patient.id}
                  className={`patient-card ${active ? 'patient-card-active' : ''}`}
                  onClick={() => onSelectPatient(patient.id)}
                  aria-pressed={active}
                  aria-label={`Select patient ${patient.name}${showNumber ? `, shortcut ${index + 1}` : ''}`}
                  variants={patientCardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="patient-card-top">
                    <div className="patient-avatar" aria-hidden="true">{patient.name.charAt(0)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{patient.name}</strong>
                        {showNumber && <span className="patient-number">{index + 1}</span>}
                        {riskPrediction && (
                          <span className={`risk-badge ${riskClass}`} title={`AI state: ${riskPrediction}`}>
                            {riskPrediction === 'Risk' ? 'R' : riskPrediction === 'Stress' ? 'S' : 'N'}
                          </span>
                        )}
                      </div>
                      <p>{patient.room || 'Room pending'} | {patient.doctor || 'Unassigned'}</p>
                    </div>
                  </div>
                  <div className="patient-card-bottom">
                    <span className={`status-pill ${patient.active ? 'status-ok' : 'status-muted'}`}>
                      {patient.active ? 'Monitoring live' : 'Standby'}
                    </span>
                    <span className="patient-age">Age {patient.age || '--'}</span>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
          {!filteredPatients.length ? (
            <div className="empty-mini">
              No patients match that search. Try a patient name, room, or clinician.
            </div>
          ) : null}
        </div>
      </motion.div>

      <div className="sidebar-footnote">
        <span>{patients.length} patients loaded</span>
        <span>{streamingPatients} with live telemetry</span>
      </div>
    </aside>
  );
}
