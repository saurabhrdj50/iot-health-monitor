import { Bell, User } from 'lucide-react';

const Navbar = () => {
  return (
    <header className="flex items-center justify-between px-6 h-16 border-b border-[var(--line)] bg-[rgba(10,22,40,0.6)] backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">IoT Health Monitor</h2>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors">
          <Bell size={20} className="text-[var(--text-secondary)]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--danger)] rounded-full" />
        </button>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[var(--line)]">
          <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
            <User size={16} className="text-[var(--accent)]" />
          </div>
          <span className="text-sm text-[var(--text-secondary)]">Dr. Admin</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
