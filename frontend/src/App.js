import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock3,
  Heart,
  Loader2,
  RefreshCw,
  ServerCrash,
  ShieldCheck,
  Thermometer,
  Waves,
  Wifi,
  WifiOff,
  Wind,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const POLL_OPTIONS = [3000, 5000, 10000, 15000];

const EMPTY_PROBABILITY = { Normal: 0, Stress: 0, Risk: 0 };

const DEFAULT_SNAPSHOT = {
  latest: null,
  history: [],
  source: 'waiting_for_data',
  model_loaded: false,
  updated_at: null,
};

const STATUS_META = {
  Normal: {
    accent: 'var(--status-normal)',
    pill: 'status-pill-normal',
    ring: 'status-ring-normal',
    panel: 'status-panel-normal',
    glow: 'shadow-[0_0_40px_rgba(34,197,94,0.16)]',
    label: 'Stable',
  },
  Stress: {
    accent: 'var(--status-stress)',
    pill: 'status-pill-stress',
    ring: 'status-ring-stress',
    panel: 'status-panel-stress',
    glow: 'shadow-[0_0_44px_rgba(245,158,11,0.18)]',
    label: 'Elevated',
  },
  Risk: {
    accent: 'var(--status-risk)',
    pill: 'status-pill-risk',
    ring: 'status-ring-risk',
    panel: 'status-panel-risk',
    glow: 'shadow-[0_0_52px_rgba(244,63,94,0.2)]',
    label: 'Critical',
  },
};

function App() {
  const [snapshot, setSnapshot] = useState(DEFAULT_SNAPSHOT);
  const [health, setHealth] = useState({ status: 'unknown', model_loaded: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [pollInterval, setPollInterval] = useState(5000);

  const fetchDashboard = async ({ silent = false } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError('');

    try {
      const [dashboardResponse, healthResponse] = await Promise.all([
        fetch(`${API_BASE}/api/v1/dashboard?limit=24`),
        fetch(`${API_BASE}/api/v1/health`),
      ]);

      if (!dashboardResponse.ok) {
        throw new Error(`Dashboard request failed with status ${dashboardResponse.status}`);
      }
      if (!healthResponse.ok) {
        throw new Error(`Health request failed with status ${healthResponse.status}`);
      }

      const [dashboardData, healthData] = await Promise.all([
        dashboardResponse.json(),
        healthResponse.json(),
      ]);

      setSnapshot({
        latest: dashboardData.latest,
        history: dashboardData.history || [],
        source: dashboardData.source,
        model_loaded: dashboardData.model_loaded,
        updated_at: dashboardData.updated_at,
      });
      setHealth(healthData);
    } catch (fetchError) {
      setError(fetchError.message || 'Unable to connect to backend.');
      setSnapshot(DEFAULT_SNAPSHOT);
      setHealth({ status: 'offline', model_loaded: false });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchDashboard({ silent: true });
    }, pollInterval);

    return () => window.clearInterval(intervalId);
  }, [pollInterval]);

  const latest = snapshot.latest;
  const currentStatus = latest?.prediction || 'Normal';
  const statusMeta = STATUS_META[currentStatus];
  const probability = latest?.probability || EMPTY_PROBABILITY;
  const history = snapshot.history.map((item) => ({
    ...item,
    timeLabel: new Date(item.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));
  const historyWithTemperature = history.filter((item) => typeof item.body_temperature === 'number');

  const kpis = [
    {
      key: 'heart_rate',
      label: 'Heart rate',
      unit: 'BPM',
      value: latest?.heart_rate,
      icon: Heart,
      tone: 'text-rose-300',
      decimals: 0,
      range: 'Target 60-100',
    },
    {
      key: 'spo2',
      label: 'SpO2',
      unit: '%',
      value: latest?.spo2,
      icon: Activity,
      tone: 'text-sky-300',
      decimals: 0,
      range: 'Target 95-100',
    },
    {
      key: 'body_temperature',
      label: 'Temperature',
      unit: '°C',
      value: latest?.body_temperature,
      icon: Thermometer,
      tone: 'text-amber-300',
      decimals: 1,
      range: 'Target 36.1-37.2',
    },
    {
      key: 'respiratory_rate',
      label: 'Respiration',
      unit: '/min',
      value: latest?.respiratory_rate,
      icon: Wind,
      tone: 'text-emerald-300',
      decimals: 1,
      range: 'Target 12-20',
    },
  ];

  const probabilityChart = [
    { name: 'Normal', value: Math.round((probability.Normal || 0) * 100), fill: '#22c55e' },
    { name: 'Stress', value: Math.round((probability.Stress || 0) * 100), fill: '#f59e0b' },
    { name: 'Risk', value: Math.round((probability.Risk || 0) * 100), fill: '#f43f5e' },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.18),_transparent_28%),linear-gradient(180deg,_#041017_0%,_#071922_35%,_#08141b_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
        <header className="glass-panel sticky top-4 z-30 mb-6 rounded-[28px] px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,rgba(56,189,248,0.22),rgba(34,197,94,0.18))] shadow-[0_12px_34px_rgba(15,118,110,0.2)]">
                <Heart className="h-7 w-7 text-cyan-200" />
              </div>
              <div>
                <p className="font-display text-sm uppercase tracking-[0.28em] text-cyan-200/70">Connected Care</p>
                <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">IoT Health Operations Console</h1>
                <p className="mt-1 text-sm text-slate-300/80">Real-time physiologic monitoring, stress triage, and model-backed status review.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ConnectionBadge isLive={!error && health.status === 'healthy'} />
              <div className="control-chip">
                <Clock3 className="h-4 w-4 text-cyan-200" />
                <span>{snapshot.updated_at ? new Date(snapshot.updated_at).toLocaleTimeString() : 'Awaiting data'}</span>
              </div>
              <div className="control-chip">
                <ShieldCheck className="h-4 w-4 text-emerald-200" />
                <span>{health.model_loaded ? 'Model ready' : 'Fallback rules'}</span>
              </div>
              <div className="control-chip">
                <label htmlFor="poll-interval" className="text-slate-300/85">
                  Refresh
                </label>
                <select
                  id="poll-interval"
                  className="bg-transparent text-sm text-white outline-none"
                  value={pollInterval}
                  onChange={(event) => setPollInterval(Number(event.target.value))}
                >
                  {POLL_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-slate-900">
                      {option / 1000}s
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => fetchDashboard({ silent: true })}
                aria-label="Refresh dashboard"
              >
                {isRefreshing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <section className="mb-6 rounded-[28px] border border-rose-400/25 bg-rose-500/10 px-5 py-4 text-sm text-rose-100 shadow-[0_18px_60px_rgba(244,63,94,0.12)]">
            <div className="flex items-center gap-3">
              <ServerCrash className="h-5 w-5 text-rose-200" />
              <span>{error}</span>
            </div>
          </section>
        ) : null}

        <main className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <section className="space-y-6">
            <div className={`glass-panel overflow-hidden rounded-[30px] p-5 sm:p-6 ${statusMeta.glow}`}>
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`status-pill ${statusMeta.pill}`}>{statusMeta.label}</span>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300/75">
                      Live inference
                    </span>
                  </div>
                  <div>
                    <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
                      {latest ? `${currentStatus} health state detected` : 'Device waiting for first reading'}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300/85 sm:text-base">
                      {latest
                        ? `Confidence is ${Math.round((latest.confidence_score || 0) * 100)}%. The dashboard keeps a rolling 24-sample window so care teams can spot drift before it becomes a sustained event.`
                        : 'As soon as the ESP8266 posts a valid measurement set, this screen will promote the current state, render trend lines, and expose the model output.'}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {kpis.map((item) => (
                      <VitalTile
                        key={item.key}
                        icon={item.icon}
                        label={item.label}
                        unit={item.unit}
                        value={item.value}
                        tone={item.tone}
                        decimals={item.decimals}
                        range={item.range}
                        loading={isLoading}
                      />
                    ))}
                  </div>
                </div>

                <div className={`status-orb-shell ${statusMeta.panel}`}>
                  <div className={`status-orb ${statusMeta.ring}`}>
                    <div className="status-orb-inner">
                      <span className="font-display text-4xl font-semibold text-white">{currentStatus}</span>
                      <span className="mt-2 text-sm text-slate-300/90">
                        {latest ? `${Math.round((latest.confidence_score || 0) * 100)}% confidence` : 'No live sample yet'}
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <MetricStrip label="Anomaly flag" value={latest?.anomaly_flag ? 'Active' : 'Clear'} />
                    <MetricStrip label="Data source" value={snapshot.source === 'device' ? 'ESP8266 stream' : 'Waiting'} />
                    <MetricStrip label="Backend" value={health.status === 'healthy' ? 'Healthy' : 'Offline'} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <Panel
                title="Vitals trajectory"
                subtitle="Heart rate and oxygen saturation over the recent sample window"
                action={history.length ? `${history.length} samples` : 'Waiting'}
              >
                {isLoading ? (
                  <ChartSkeleton />
                ) : history.length > 1 ? (
                  <ResponsiveContainer width="100%" height={290}>
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="hrFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fb7185" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#fb7185" stopOpacity={0.04} />
                        </linearGradient>
                        <linearGradient id="spo2Fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.38} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(148,163,184,0.16)" vertical={false} />
                      <XAxis dataKey="timeLabel" stroke="#94a3b8" tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} width={36} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="heart_rate" stroke="#fb7185" strokeWidth={2.5} fill="url(#hrFill)" />
                      <Area type="monotone" dataKey="spo2" stroke="#38bdf8" strokeWidth={2.5} fill="url(#spo2Fill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    icon={Waves}
                    title="No trend yet"
                    body="Send at least two sensor payloads to unlock the timeline view."
                  />
                )}
              </Panel>

              <Panel title="Prediction mix" subtitle="Current model confidence split across states">
                {isLoading ? (
                  <ChartSkeleton compact />
                ) : (
                  <div className="grid gap-5 lg:grid-cols-1 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={probabilityChart}
                            dataKey="value"
                            innerRadius={58}
                            outerRadius={86}
                            paddingAngle={5}
                            stroke="rgba(8,20,27,0.92)"
                            strokeWidth={4}
                          >
                            {probabilityChart.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {probabilityChart.map((item) => (
                        <ProbabilityRow key={item.name} item={item} />
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Temperature line" subtitle="Body temperature drift and acute changes">
                {isLoading ? (
                  <ChartSkeleton compact />
                ) : historyWithTemperature.length > 1 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={historyWithTemperature}>
                      <CartesianGrid stroke="rgba(148,163,184,0.16)" vertical={false} />
                      <XAxis dataKey="timeLabel" stroke="#94a3b8" tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} domain={[35.5, 38.5]} width={36} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="body_temperature" stroke="#fbbf24" strokeWidth={2.6} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={Thermometer} title="No temperature stream yet" body="A live chart appears after the device posts enough samples." />
                )}
              </Panel>

              <Panel title="Respiratory cadence" subtitle="Breathing rhythm estimate tracked over time">
                {isLoading ? (
                  <ChartSkeleton compact />
                ) : history.length > 1 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={history}>
                      <CartesianGrid stroke="rgba(148,163,184,0.16)" vertical={false} />
                      <XAxis dataKey="timeLabel" stroke="#94a3b8" tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} domain={[10, 25]} width={36} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="respiratory_rate" stroke="#34d399" strokeWidth={2.6} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={Wind} title="Respiration trend pending" body="Breath-rate history will render automatically after the first stream." />
                )}
              </Panel>
            </div>
          </section>

          <aside className="space-y-6">
            <Panel title="Device overview" subtitle="Latest source, model mode, and operational notes">
              <div className="space-y-3">
                <AsideRow label="Stream source" value={snapshot.source === 'device' ? 'ESP8266 live feed' : 'Waiting for feed'} />
                <AsideRow label="Inference mode" value={health.model_loaded ? 'Trained model' : 'Rule fallback'} />
                <AsideRow label="Last packet" value={snapshot.updated_at ? new Date(snapshot.updated_at).toLocaleString() : 'No packet received'} />
                <AsideRow label="GSR" value={typeof latest?.gsr === 'number' ? `${Math.round(latest.gsr).toLocaleString()} Ω` : 'Not supplied'} />
              </div>
            </Panel>

            <Panel title="Clinical watchlist" subtitle="Priority cues generated from the current state">
              <div className="space-y-3">
                <WatchItem
                  active={Boolean(latest && latest.heart_rate > 100)}
                  title="Cardiac escalation"
                  body="Heart rate is above the preferred baseline band."
                />
                <WatchItem
                  active={Boolean(latest && latest.spo2 < 95)}
                  title="Oxygen dip"
                  body="Saturation is slipping under the typical recovery zone."
                />
                <WatchItem
                  active={Boolean(latest && typeof latest.body_temperature === 'number' && latest.body_temperature > 37.5)}
                  title="Thermal stress"
                  body={typeof latest?.body_temperature === 'number' ? 'Body temperature is entering a stressed or febrile range.' : 'Temperature sensor is offline, so thermal escalation is on hold.'}
                />
              </div>
            </Panel>

            <Panel title="Recent payloads" subtitle="Last five accepted backend readings">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className="h-14 animate-pulse rounded-2xl bg-white/6" />
                  ))}
                </div>
              ) : history.length ? (
                <div className="space-y-3">
                  {history
                    .slice(-5)
                    .reverse()
                    .map((item) => (
                      <div key={item.timestamp} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 transition duration-300 hover:border-cyan-300/30 hover:bg-white/[0.06]">
                        <div className="flex items-center justify-between text-sm text-slate-200">
                          <span>{item.timeLabel}</span>
                          <span>{item.prediction || 'Pending'}</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
                          <span>HR {Math.round(item.heart_rate)} BPM</span>
                          <span>SpO2 {Math.round(item.spo2)}%</span>
                          <span>Temp {typeof item.body_temperature === 'number' ? `${item.body_temperature.toFixed(1)}°C` : 'Sensor offline'}</span>
                          <span>RR {item.respiratory_rate.toFixed(1)}/min</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <EmptyState icon={WifiOff} title="No accepted payloads" body="Once the backend receives valid JSON, recent packets will appear here." />
              )}
            </Panel>
          </aside>
        </main>
      </div>
    </div>
  );
}

function ConnectionBadge({ isLive }) {
  return (
    <div className={`connection-badge ${isLive ? 'connection-live' : 'connection-offline'}`}>
      {isLive ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      <span>{isLive ? 'Backend connected' : 'Backend offline'}</span>
    </div>
  );
}

function VitalTile({ icon: Icon, label, unit, value, tone, decimals, range, loading }) {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between">
        <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</span>
      </div>
      {loading ? (
        <div className="mt-5 h-10 animate-pulse rounded-2xl bg-white/8" />
      ) : (
        <div className="mt-5 flex items-end gap-2">
          <span className="font-display text-4xl font-semibold text-white">
            {typeof value === 'number' ? value.toFixed(decimals) : '--'}
          </span>
          <span className="pb-1 text-sm text-slate-400">{unit}</span>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400">{range}</p>
    </div>
  );
}

function Panel({ title, subtitle, action, children }) {
  return (
    <section className="glass-panel rounded-[30px] p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-white">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        {action ? <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{action}</span> : null}
      </div>
      {children}
    </section>
  );
}

function ProbabilityRow({ item }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-slate-200">{item.name}</span>
        <span className="text-sm font-semibold text-white">{item.value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${item.value}%`, backgroundColor: item.fill }} />
      </div>
    </div>
  );
}

function AsideRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function MetricStrip({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function WatchItem({ active, title, body }) {
  return (
    <div className={`rounded-2xl border px-4 py-4 transition duration-300 ${active ? 'border-rose-300/30 bg-rose-500/10' : 'border-white/[0.08] bg-white/[0.04]'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-full p-2 ${active ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/[0.12] text-emerald-200'}`}>
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-black/10 px-6 py-8 text-center">
      <div className="mb-4 rounded-2xl bg-white/[0.04] p-3 text-cyan-200">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-display text-xl font-semibold text-white">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">{body}</p>
    </div>
  );
}

function ChartSkeleton({ compact = false }) {
  return <div className={`animate-pulse rounded-[24px] bg-white/[0.05] ${compact ? 'h-[220px]' : 'h-[290px]'}`} />;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-6 text-sm">
            <span className="text-slate-300">{entry.name || entry.dataKey}</span>
            <span style={{ color: entry.color }}>{typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;

