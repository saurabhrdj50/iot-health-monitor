import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const DISMISS_DURATION = 3800;

export default function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = iconMap[toast.tone] || Info;
          return <ToastItem key={toast.id} toast={toast} Icon={Icon} onDismiss={onDismiss} />;
        })}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, Icon, onDismiss }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / DISMISS_DURATION) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className={`toast-card toast-${toast.tone || 'info'}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      initial={{ opacity: 0, x: 80, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.92, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
      layout
    >
      <div className="toast-icon-shell">
        <Icon className="h-4 w-4" />
      </div>
      <div className="toast-copy">
        <strong>{toast.title}</strong>
        {toast.body ? <p>{toast.body}</p> : null}
      </div>
      <motion.button
        onClick={() => onDismiss(toast.id)}
        aria-label={`Dismiss notification: ${toast.title}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Dismiss
      </motion.button>
      <div className="toast-progress-bar" style={{ width: `${progress}%` }} />
    </motion.div>
  );
}
