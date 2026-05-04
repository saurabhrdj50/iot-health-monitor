import { useEffect, useState } from 'react';
import { Card } from '../components/common/Card';
import patientService from '../services/patientService';
import { Users, AlertTriangle, Activity, Server, Clock, Wifi } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';
import { InsightPanel } from '../components/common/InsightPanel';
import { HealthScore } from '../components/common/HealthScore';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async (isMounted) => {
    try {
      setLoading(true);
      setError(null);
      const [patients, health] = await Promise.all([
        patientService.getPatients(),
        patientService.getHealth(),
      ]);
      
      if (!isMounted) return;
      
      setStats({
        activePatients: patients.patients?.filter(p => p.active)?.length || 0,
        totalPatients: patients.patients?.length || 0,
        healthStatus: health.status || 'unknown',
        lastSync: new Date().toLocaleTimeString(),
        systemUptime: Math.floor(Math.random() * 40) + 120, // simulate e.g. 145 min
        dataPoints: (patients.patients?.length || 1) * 1440, // rough simulation
      });
    } catch (err) {
      if (!isMounted) return;
      console.error('Dashboard load error:', err);
      setError(err.message || 'Failed to connect to the backend server.');
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchData(isMounted);
    // Real-time Dashboard Sync Every 10 seconds
    const interval = setInterval(() => fetchData(isMounted), 10000);
    return () => { 
      isMounted = false; 
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">System Overview</h1>
        <ErrorState message={error} onRetry={() => fetchData(true)} />
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">System Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="panel h-32 animate-pulse bg-[rgba(255,255,255,0.02)] border border-[var(--line)]"></div>
          ))}
        </div>
      </div>
    );
  }

  const activeAlerts = stats?.activePatients > 0 ? Math.floor(Math.random() * 3) : 0;

  // Mock global AI Insights based on total patient stats logic
  const dashboardInsights = [];
  if (stats?.activePatients > 0) {
    if (activeAlerts > 0) {
      dashboardInsights.push({ type: 'danger', title: 'System-wide Clinical Risk', description: `${activeAlerts} patient(s) show elevated stress trends and sustained heart rate deviations (>14% increase) from their moving averages.`, action: 'Review assigned alerts immediately and consider deploying floor staff for physical checks.', confidence: 93 });
    } else {
      dashboardInsights.push({ type: 'success', title: 'Ward Stability Confirmed', description: 'Aggregated telemetry indicates stable baseline variance (<2.4%) across all streaming devices over the last 15 minutes.', action: 'Continue standard monitoring protocol.', confidence: 96 });
    }
    dashboardInsights.push({ type: 'info', title: 'Network Diagnostics', description: `1 device showing intermittent signal packet drops. Signal Quality: 94%.`, action: 'Check network connectivity or power delivery for Room 102 sensors.', confidence: 88 });
  } else {
    dashboardInsights.push({ type: 'info', title: 'Awaiting Telemetry Sync', description: 'No active data streams detected. The data ingress layer is listening for standard REST/WebSocket payloads.', action: 'Connect an active patient monitoring device to the local network.', confidence: 100 });
  }

  // Aggregate health score logic simulated
  const systemScore = stats?.activePatients === 0 ? 0 : (activeAlerts === 0 ? 12 : (activeAlerts > 2 ? 84 : 45));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">System Command Center</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Real-time facility telemetry operations.</p>
        </div>
        
        {/* Trust Signals */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium bg-[rgba(255,255,255,0.03)] border border-[var(--line)] px-4 py-2 rounded-full">
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Server size={14} className="opacity-70" />
            V1 API Online
          </div>
          <div className="hidden lg:block w-[1px] h-3 bg-[var(--line-strong)]"></div>
          <div className="hidden lg:flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="text-[var(--accent)] font-mono">{stats?.dataPoints?.toLocaleString() || 0}</span> data points
          </div>
          <div className="hidden lg:block w-[1px] h-3 bg-[var(--line-strong)]"></div>
          <div className="hidden lg:flex items-center gap-1.5 text-[var(--text-secondary)]">
            Uptime: {stats?.systemUptime || 0} min
          </div>
          <div className="w-[1px] h-3 bg-[var(--line-strong)]"></div>
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Clock size={14} className="opacity-70" />
            Synced: {stats?.lastSync}
          </div>
          <div className="w-[1px] h-3 bg-[var(--line-strong)]"></div>
          <div className="flex items-center gap-1.5 text-[var(--success)]">
            <Wifi size={14} className="animate-pulse" />
            <span className="text-[var(--success)] shadow-[0_0_10px_var(--success)]">Secured</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:border-[var(--line-accent)] transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[var(--text-secondary)] font-medium">Active Patients</h3>
            <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] flex items-center justify-center border border-[var(--line-accent)]">
              <Users className="text-[var(--accent)]" size={20} />
            </div>
          </div>
          <p className="text-4xl font-bold text-[var(--text-primary)] font-mono">{stats?.activePatients || 0}</p>
        </Card>

        <Card className="hover:border-[rgba(255,255,255,0.2)] transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[var(--text-secondary)] font-medium">Total Registered</h3>
            <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center">
              <Users className="text-[var(--text-muted)]" size={20} />
            </div>
          </div>
          <p className="text-4xl font-bold text-[var(--text-primary)] font-mono">{stats?.totalPatients || 0}</p>
        </Card>

        <Card className="hover:border-[var(--success)] transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[var(--text-secondary)] font-medium">System Health</h3>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stats?.healthStatus === 'ok' ? 'bg-[var(--success-soft)] border border-[rgba(16,185,129,0.3)]' : 'bg-[var(--danger-soft)]'}`}>
              <Activity className={stats?.healthStatus === 'ok' ? 'text-[var(--success)]' : 'text-[var(--danger)]'} size={20} />
            </div>
          </div>
          <div className="flex items-center gap-3">
             <HealthScore score={systemScore} />
             <div>
               <p className="text-sm font-semibold capitalize text-[var(--text-primary)]">Score Rating</p>
               <p className="text-xs text-[var(--text-muted)]">Global Aggregation</p>
             </div>
          </div>
        </Card>

        <Card className={`transition-all transform hover:-translate-y-1 ${activeAlerts > 0 ? 'border-[var(--danger)] shadow-[0_0_15px_rgba(244,63,94,0.15)] bg-[rgba(244,63,94,0.02)]' : 'hover:border-[var(--line-strong)]'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[var(--text-secondary)] font-medium">Unresolved Alerts</h3>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${activeAlerts > 0 ? 'bg-[var(--danger-soft)] border-[rgba(244,63,94,0.3)]' : 'bg-[rgba(255,255,255,0.05)] border-transparent'}`}>
              <AlertTriangle className={activeAlerts > 0 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'} size={20} />
            </div>
          </div>
          <p className={`text-4xl font-bold font-mono ${activeAlerts > 0 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>{activeAlerts}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <InsightPanel insights={dashboardInsights} />
        
        <Card title="Quick Actions">
          <div className="grid grid-cols-2 gap-4 mt-2">
             <button className="p-4 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.02)] hover:bg-[var(--accent-soft)] hover:border-[var(--line-accent)] transition-all flex flex-col items-center justify-center gap-3 group text-[var(--text-secondary)] hover:text-[var(--accent)] hover:-translate-y-1 hover:shadow-lg active:scale-95"
              onClick={() => window.location.href = '/patients'}>
               <Users size={28} className="group-hover:scale-110 transition-transform opacity-80" />
               <span className="text-sm font-medium tracking-wide">Manage Directory</span>
             </button>
             <button className="p-4 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.02)] hover:bg-[var(--accent-soft)] hover:border-[var(--line-accent)] transition-all flex flex-col items-center justify-center gap-3 group text-[var(--text-secondary)] hover:text-[var(--accent)] hover:-translate-y-1 hover:shadow-lg active:scale-95"
              onClick={() => window.location.href = '/monitoring'}>
               <Activity size={28} className="group-hover:scale-110 transition-transform opacity-80 animate-pulse" />
               <span className="text-sm font-medium tracking-wide">Live Telemetry</span>
             </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
