import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Save } from 'lucide-react';

export default function NotesPanel({
  patient,
  noteDraft,
  onChange,
  onSave,
  saving,
}) {
  return (
    <div className="panel admin-panel gradient-border">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Clinician Notes</p>
          <h3>Shift Handoff Note</h3>
        </div>
      </div>
      <p className="panel-copy">
        Save concise patient context so the next clinician immediately understands risk, trend direction, and what to verify next.
      </p>
      <textarea className="notes-editor" rows={6} value={noteDraft} onChange={(event) => onChange(event.target.value)} placeholder="Add handoff notes, care actions, or bedside context..." />
      <div className="context-strip">
        <span>{patient?.doctor || 'Doctor pending'}</span>
        <span>{patient?.room || 'Room pending'}</span>
      </div>
      <p className="notes-helper-copy">Include what changed, what was ruled out, and what the next shift should verify first.</p>
      <motion.button
        className="primary-button"
        onClick={onSave}
        disabled={saving || !patient}
        whileHover={{ scale: saving || !patient ? 1 : 1.02 }}
        whileTap={{ scale: saving || !patient ? 1 : 0.98 }}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save note
      </motion.button>
    </div>
  );
}
