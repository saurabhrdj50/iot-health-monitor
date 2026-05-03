import React, { useId, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  busy = false,
}) {
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCancel}
        >
          <motion.div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-icon">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="eyebrow">Protected Action</p>
            <h3 id={titleId}>{title}</h3>
            <p id={bodyId}>{body}</p>
            <div className="modal-warning-chip">This action cannot be undone.</div>
            <div className="modal-actions">
              <motion.button
                className="secondary-button"
                onClick={onCancel}
                disabled={busy}
                autoFocus
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {cancelLabel}
              </motion.button>
              <motion.button
                className="primary-button modal-danger-button"
                onClick={onConfirm}
                disabled={busy}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
