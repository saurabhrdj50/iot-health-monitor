import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Radio, AlertTriangle, Activity, MessageSquare, BarChart3, Settings, Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/patients', label: 'Patients', icon: Users },
  { path: '/monitoring', label: 'Monitoring', icon: Radio },
  { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/feedback', label: 'Feedback', icon: MessageSquare },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/admin', label: 'Admin', icon: Shield },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar-panel ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <button className="sidebar-collapse-btn" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <Menu size={14} /> : <X size={14} />}
      </button>

      <div className="brand-block">
        <div className="brand-badge">
          <Activity size={20} />
        </div>
        <div>
          <h1>IoT Health</h1>
          <p className="eyebrow">Command Center</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
