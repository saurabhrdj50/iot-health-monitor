import { Card } from '../components/common/Card';
import LineChart from '../components/charts/LineChart';
import { BarChart3, Activity } from 'lucide-react';

const Analytics = () => {
  const sampleData = [
    { time: '00:00', value: 72 },
    { time: '04:00', value: 75 },
    { time: '08:00', value: 71 },
    { time: '12:00', value: 68 },
    { time: '16:00', value: 74 },
    { time: '20:00', value: 79 },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">System Analytics</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">Global telemetry trends and ML inference insights.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Average Heart Rate Trend" subtitle="Global 24h aggregate (Mocked Data)">
          <div className="h-64 mt-2">
            <LineChart data={sampleData} dataKey="value" color="#00e5ff" height={240} />
          </div>
        </Card>
        
        <Card title="Global Health Score" subtitle="AI prediction confidence average" className="flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[250px]">
            <div className="w-24 h-24 rounded-full border-4 border-[var(--line-accent)] flex items-center justify-center shadow-[0_0_30px_rgba(0,229,255,0.15)] mb-4">
              <p className="text-4xl font-bold text-[var(--accent)]">--</p>
            </div>
            <p className="text-sm text-[var(--text-muted)] font-medium">Insufficient Data Threshold</p>
            <p className="text-xs text-[var(--text-disabled)] mt-2 max-w-xs">Connecting more active patients will establish a baseline health score for the system.</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-[var(--line-accent)] transition-colors text-center py-6">
          <Activity size={28} className="mx-auto text-[var(--success)] mb-3" />
          <p className="text-sm text-[var(--text-muted)]">System Uptime</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">99.9%</p>
        </Card>
        <Card className="hover:border-[var(--line-accent)] transition-colors text-center py-6">
          <BarChart3 size={28} className="mx-auto text-[var(--accent)] mb-3" />
          <p className="text-sm text-[var(--text-muted)]">Data Signals Processed</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">--</p>
        </Card>
        <Card className="text-center py-6 border-[var(--line)]">
          <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.02)] border border-[var(--line)] mx-auto flex items-center justify-center mb-3">
             <span className="text-[var(--text-disabled)] text-sm">N/A</span>
          </div>
          <p className="text-sm text-[var(--text-muted)]">Total Anomalies</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] font-mono">0</p>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
