import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutDashboard, Users, FileText, Settings, Activity } from 'lucide-react';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'ward', label: 'Ward', icon: Users },
  { key: 'reports', label: 'Reports', icon: FileText },
  { key: 'settings', label: 'Settings', icon: Settings },
];

function MobileNav({ currentRoute, onNavigate }) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <div className="mobile-nav-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.key;
          return (
            <button
              key={item.key}
              className={`mobile-nav-item ${isActive ? 'mobile-nav-item-active' : ''}`}
              onClick={() => onNavigate(item.key)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ExpandedChartModal({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="chart-expanded-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="chart-expanded-container"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="chart-expanded-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                <h3>Expanded Telemetry View</h3>
              </div>
              <button
                className="ghost-button small"
                onClick={onClose}
                aria-label="Close expanded chart"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
            <div className="chart-expanded-body">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { MobileNav, ExpandedChartModal };
export default memo(MobileNav);
