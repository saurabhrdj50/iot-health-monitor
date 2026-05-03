import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function AdminControlsPanel({
  adminToken,
  onAdminTokenChange,
  onOpenResetConfirm,
  resetting,
  disabled,
}) {
  return (
    <div className="panel admin-panel gradient-border">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Secure Controls</p>
          <h3>Protected Reset</h3>
        </div>
        <ShieldAlert className="h-5 w-5 text-amber-200" />
      </div>
      <p className="panel-copy">
        Destructive telemetry reset requires the shared admin token. Set <code>IHM_ADMIN_TOKEN</code> in the backend environment for production use.
      </p>
      <div className="admin-warning-chip">Restricted action • patient history will be deleted</div>
      <div className="admin-row">
        <input type="password" value={adminToken} onChange={(event) => onAdminTokenChange(event.target.value)} placeholder="Enter admin token" />
        <motion.button
          className="secondary-button"
          onClick={onOpenResetConfirm}
          disabled={disabled || !adminToken}
          whileHover={{ scale: disabled || !adminToken ? 1 : 1.02 }}
          whileTap={{ scale: disabled || !adminToken ? 1 : 0.98 }}
        >
          {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
          Reset selected patient
        </motion.button>
      </div>
    </div>
  );
}
