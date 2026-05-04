import { Card } from '../components/common/Card';

const SettingsPage = () => {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Preferences</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">Manage global display settings and notification routing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Display Settings">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded bg-[rgba(255,255,255,0.02)] border border-[var(--line)]">
              <div>
                <p className="font-medium text-[var(--text-primary)]">Dark Mode Theme</p>
                <p className="text-sm text-[var(--text-muted)]">Always on for clinical monitoring</p>
              </div>
              <button className="px-3 py-1 bg-[var(--success-soft)] text-[var(--success)] rounded font-semibold text-xs border border-[rgba(16,185,129,0.2)] tracking-wide">ENABLED</button>
            </div>
             <div className="flex justify-between items-center p-3 rounded bg-[rgba(255,255,255,0.02)] border border-[var(--line)]">
              <div>
                <p className="font-medium text-[var(--text-primary)]">Compact Density</p>
                <p className="text-sm text-[var(--text-muted)]">Increase data density in tables</p>
              </div>
              <button className="px-3 py-1 bg-[rgba(255,255,255,0.05)] text-[var(--text-disabled)] rounded font-semibold text-xs border border-[var(--line)] tracking-wide">DISABLED</button>
            </div>
          </div>
        </Card>

        <Card title="Notification Toggles">
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded bg-[rgba(255,255,255,0.02)] border border-[var(--line)] cursor-pointer hover:border-[var(--line-accent)] transition-colors">
              <span className="text-[var(--text-primary)] font-medium">Critical Alerts</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[var(--accent)] cursor-pointer" />
            </label>
            <label className="flex items-center justify-between p-3 rounded bg-[rgba(255,255,255,0.02)] border border-[var(--line)] cursor-pointer hover:border-[var(--line-accent)] transition-colors">
              <span className="text-[var(--text-primary)] font-medium">Warning Thresholds</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[var(--accent)] cursor-pointer" />
            </label>
            <label className="flex items-center justify-between p-3 rounded bg-[rgba(255,255,255,0.02)] border border-[var(--line)] cursor-pointer hover:border-[var(--line-accent)] transition-colors">
              <span className="text-[var(--text-primary)] font-medium">Audible Alarms</span>
              <input type="checkbox" className="w-5 h-5 accent-[var(--accent)] cursor-pointer" />
            </label>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
