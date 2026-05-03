import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDateTime } from '../../lib/dashboard';

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: 12, transition: { duration: 0.2 } },
};

export default function EventTimeline({ items }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Event Timeline</p>
          <h3>Recent Workflow Events</h3>
        </div>
      </div>
      <div className="timeline-list">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              className="timeline-item"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
            >
              <div className={`timeline-dot timeline-${item.tone}`} />
              <div className="timeline-copy">
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                <span>{formatDateTime(item.timestamp)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!items.length ? (
          <motion.div
            className="empty-mini empty-panel-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            No workflow events have been logged yet.
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
