import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import LiveMonitoring from './pages/LiveMonitoring';
import PatientHistory from './pages/PatientHistory';
import PatientReport from './pages/PatientReport';
import Monitoring from './pages/Monitoring';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Feedback from './pages/Feedback';
import SettingsPage from './pages/SettingsPage';
import Admin from './pages/Admin';
import { useThemeStore } from './context/themeStore';
import { useAuthStore } from './context/authStore';

const Login = () => {
  const [token, setToken] = useState('');
  const { setAuth } = useAuthStore();

  const handleLogin = (e) => {
    e.preventDefault();
    if (token) {
      setAuth(token);
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)]">
      <div className="panel w-full max-w-md">
        <div className="panel-header">
          <h3>IoT Health Monitor</h3>
          <p className="panel-copy">Sign in to access the dashboard</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter admin token"
            className="w-full p-3 rounded-lg bg-[rgba(6,13,24,0.48)] border border-[var(--line)] text-[var(--text-primary)]"
          />
          <button type="submit" className="primary-button w-full">Sign In</button>
        </form>
      </div>
    </div>
  );
};

const App = () => {
  const { isDark } = useThemeStore();

  return (
    <div className={isDark ? 'dark' : ''}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id/live" element={<LiveMonitoring />} />
            <Route path="/patients/:id/history" element={<PatientHistory />} />
            <Route path="/patients/:id/report" element={<PatientReport />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;
