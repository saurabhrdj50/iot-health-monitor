import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';

const bulletVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1, duration: 0.3, ease: 'easeOut' },
  }),
};

export default function HandoffSummaryPanel({ summary }) {
  return (
    <div className="panel gradient-border">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Shift Handoff</p>
          <h3>Clinician Summary</h3>
        </div>
        <ClipboardList className="h-5 w-5" style={{ color: 'var(--accent)' }} />
      </div>
      <div className="handoff-panel">
        <strong>{summary.headline}</strong>
        <p>{summary.summary}</p>
        <div className="handoff-bullets">
          {summary.bullets.map((bullet, index) => (
            <motion.div
              key={`${bullet}-${index}`}
              className="handoff-bullet"
              variants={bulletVariants}
              initial="hidden"
              animate="visible"
              custom={index}
              whileHover={{ x: 4 }}
            >
              {bullet}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
