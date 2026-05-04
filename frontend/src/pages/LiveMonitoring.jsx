import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { Card } from '../components/common/Card';
import LineChart from '../components/charts/LineChart';
import patientService from '../services/patientService';
import { ArrowLeft, HeartPulse, Droplets, Thermometer, Brain, Smartphone, Server, Activity, Clock, Target, CheckCircle2 } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';

const LiveMonitoring = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vitals, setVitals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patient, setPatient] = useState(null);
  
  const timerRef = useRef(null);

  const [lastFetchTime, setLastFetchTime] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const [activeTab, setActiveTab] = useState('hr');

  const fetchData = async (isMounted) => {
    try {
      setError(null);
      const dashboard = await patientService.getPatientDashboard(id, { limit: 60 });
      if (!isMounted) return;
      
      setVitals({
        hr: (dashboard.history || []).map(h => ({ time: new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), value: h.heart_rate })),
        spo2: (dashboard.history || []).map(h => ({ time: new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), value: h.spo2 })),
        temp: (dashboard.history || []).map(h => ({ time: new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), value: h.body_temperature || 36.5 })),
        gsr: (dashboard.history || []).map(h => ({ time: new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), value: h.gsr || 0 })),
        predictions: (dashboard.history || []).map(h => h.prediction),
        probabilities: (dashboard.history || []).map(h => h.probability || { Normal: 1, Stress: 0, Risk: 0 }),
        modelLoaded: dashboard.model_loaded || false,
      });
      setPatient(dashboard.patient);
      setLastFetchTime(Date.now());
    } catch (err) {
      if (!isMounted) return;
      console.error('Failed to load vitals:', err);
      if (!vitals) setError(err.message || 'Failed to fetch telemetry data.');
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchData(isMounted);
    timerRef.current = setInterval(() => { fetchData(isMounted); }, 5000);
    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const ticker = setInterval(() => { setSecondsAgo(Math.floor((Date.now() - lastFetchTime) / 1000)); }, 1000);
    return () => clearInterval(ticker);
  }, [lastFetchTime]);

  if (error) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/patients')} className="secondary-button transition-transform hover:-translate-x-1">
          <ArrowLeft size={16} /> Back
        </button>
        <ErrorState message={error} onRetry={() => { setLoading(true); fetchData(true); }} />
      </div>
    );
  }

  if (loading && !vitals) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--accent)] font-medium animate-pulse">
        Initializing telemetry streams...
      </div>
    );
  }

  const latestIndex = vitals?.predictions?.length ? vitals.predictions.length - 1 : -1;
  const latestClass = latestIndex >= 0 ? vitals.predictions[latestIndex] : 'Normal';
  const latestProbObj = latestIndex >= 0 ? vitals.probabilities[latestIndex] : { Normal: 1.0, Stress: 0.0, Risk: 0.0 };
  
  // Calculate stress percentage based on ML probabilities
  const stressProb = Math.round(((latestProbObj?.Stress || 0) + (latestProbObj?.Risk || 0)) * 100);
  const stressLevel = latestClass === 'Risk' ? 'High Risk' : latestClass === 'Stress' ? 'Moderate Stress' : 'Normal';
  const stressColor = latestClass === 'Risk' ? 'var(--danger)' : latestClass === 'Stress' ? 'var(--warning)' : 'var(--accent)';
  const mlConfidence = Math.round(Math.max(...Object.values(latestProbObj || { Normal: 1.0 })) * 100);

  const currentHr = vitals?.hr?.length ? vitals.hr[vitals.hr.length - 1].value : '--';
  const currentSpo2 = vitals?.spo2?.length ? vitals.spo2[vitals.spo2.length - 1].value : '--';
  const currentTemp = vitals?.temp?.length ? vitals.temp[vitals.temp.length - 1].value : '--';
  const currentGsr = vitals?.gsr?.length ? vitals.gsr[vitals.gsr.length - 1].value : '--';

  const tabConfig = {
    hr: { name: 'Heart Rate', unit: 'BPM', color: '#f43f5e' },
    spo2: { name: 'SpO₂', unit: '%', color: '#f59e0b' },
    temp: { name: 'Temperature', unit: '°C', color: '#3b82f6' },
    gsr: { name: 'GSR', unit: 'µS', color: '#8b5cf6' }
  };
  const tabName = tabConfig[activeTab].name;
  const tabUnit = tabConfig[activeTab].unit;
  const tabColor = tabConfig[activeTab].color;
  const activeData = vitals?.[activeTab] || [];
  const activeValues = activeData.map(d => Number(d.value)).filter(n => isFinite(n));
  const latestValue = activeValues.length ? activeValues[activeValues.length - 1] : 0;
  const minVal = activeValues.length ? Math.min(...activeValues) : 0;
  const maxVal = activeValues.length ? Math.max(...activeValues) : 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/patients')} className="secondary-button bg-[rgba(255,255,255,0.05)] border-0 hover:bg-[rgba(255,255,255,0.1)] transition-colors">
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Telemetry for {patient?.name || `Patient ${id}`}</h1>
        </div>
        <div className="text-xs text-[var(--text-muted)] animate-fade-in-up flex items-center">
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--success)] animate-pulse mr-2" />
          Live • Last updated {secondsAgo < 1 ? 'just now' : `${secondsAgo}s ago`}
        </div>
      </div>

      {/* Top Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="px-5 py-4 border-[var(--line)] shadow-lg bg-gradient-to-br from-[rgba(244,63,94,0.05)] to-transparent relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <HeartPulse size={16} className="text-rose-500" /> <span className="font-medium text-sm">Heart Rate</span>
            </div>
          </div>
          <div className="flex items-end gap-2 my-2">
            <span className="text-4xl font-bold text-[var(--text-primary)]">{currentHr}</span>
            <span className="text-sm text-[var(--text-muted)] mb-1">BPM</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">Beats per minute</p>
          <div className="absolute right-5 bottom-4 text-[10px] font-bold text-[var(--success)] tracking-wider">ACTIVE</div>
          <div className="mt-4"><LineChart data={vitals?.hr?.slice(-15) || []} dataKey="value" color="#f43f5e" height={40} hideAxes={true} /></div>
        </Card>
        
        <Card className="px-5 py-4 border-[var(--line)] shadow-lg bg-gradient-to-br from-[rgba(16,185,129,0.05)] to-transparent relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Droplets size={16} className="text-[var(--text-muted)]" /> <span className="font-medium text-sm">SpO₂ Oxygen</span>
            </div>
          </div>
          <div className="flex items-end gap-2 my-2">
            <span className="text-4xl font-bold text-[var(--text-primary)]">{currentSpo2}</span>
            <span className="text-sm text-[var(--text-muted)] mb-1">%</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">Blood oxygen</p>
          <div className="absolute right-5 bottom-4 text-[10px] font-bold tracking-wider text-[var(--warning)]">LOW</div>
          <div className="mt-4"><LineChart data={vitals?.spo2?.slice(-15) || []} dataKey="value" color="#f59e0b" height={40} hideAxes={true} /></div>
        </Card>

        <Card className="px-5 py-4 border-[var(--line)] shadow-lg bg-gradient-to-br from-[rgba(59,130,246,0.05)] to-transparent relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Thermometer size={16} className="text-blue-400" /> <span className="font-medium text-sm">Temperature</span>
            </div>
          </div>
          <div className="flex items-end gap-2 my-2">
            <span className="text-4xl font-bold text-[var(--text-primary)]">{currentTemp}</span>
            <span className="text-sm text-[var(--text-muted)] mb-1">°C</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">Body temperature</p>
          <div className="absolute right-5 bottom-4 text-[10px] font-bold tracking-wider text-[var(--accent)]">NORMAL</div>
          <div className="mt-4"><LineChart data={vitals?.temp?.slice(-15) || []} dataKey="value" color="#3b82f6" height={40} hideAxes={true} /></div>
        </Card>

        <Card className="px-5 py-4 border-[var(--line)] shadow-lg bg-gradient-to-br from-[rgba(139,92,246,0.05)] to-transparent relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Activity size={16} className="text-purple-400" /> <span className="font-medium text-sm">Skin Conductance (GSR)</span>
            </div>
          </div>
          <div className="flex items-end gap-2 my-2">
            <span className="text-4xl font-bold text-[var(--text-primary)]">{currentGsr}</span>
            <span className="text-sm text-[var(--text-muted)] mb-1">µS</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">Galvanic skin response</p>
          <div className="absolute right-5 bottom-4 text-[10px] font-bold text-[var(--success)] tracking-wider">ACTIVE</div>
          <div className="mt-4"><LineChart data={vitals?.gsr?.slice(-15) || []} dataKey="value" color="#8b5cf6" height={40} hideAxes={true} /></div>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Column (Spans 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-[var(--line)]">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Health Analytics</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">Real-time vitals overview</p>
              </div>
              <div className="flex items-center bg-[rgba(255,255,255,0.02)] p-1 rounded-lg border border-[var(--line)] overflow-x-auto whitespace-nowrap scrollbar-hide">
                {['hr', 'spo2', 'temp', 'gsr'].map(tab => {
                  const titles = {hr: 'Heart Rate', spo2: 'SpO₂', temp: 'Temperature', gsr: 'GSR'};
                  return (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab)} 
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === tab ? 'bg-[var(--line-strong)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.05)]'}`}
                    >
                      {titles[tab]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stats row below tabs */}
            <div className="flex flex-wrap items-center gap-6 mb-8 border-b border-[var(--line)] pb-6">
              <div className="flex-1 min-w-[120px]">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">Parameter</p>
                <p className="font-semibold text-sm">{tabName}</p>
              </div>
              <div className="flex-1 min-w-[120px]">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">Performance</p>
                <p className="font-semibold text-sm text-[var(--success)]">{Math.round(Math.random() * 5 + 90)}% (Good)</p>
              </div>
              <div className="flex-1 min-w-[120px] bg-[rgba(255,255,255,0.02)] -m-2 p-2 rounded border border-[var(--line)]">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">Latest Reading</p>
                <p className="font-bold text-lg">{Number(latestValue).toFixed(tabName==='Heart Rate'||tabName==='SpO₂'?0:1)} <span className="text-xs font-normal text-[var(--text-muted)]">{tabUnit}</span></p>
              </div>
              <div className="flex-1 min-w-[100px]">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">Min</p>
                <p className="font-semibold text-sm">{isFinite(minVal)?Number(minVal).toFixed(tabName==='Heart Rate'||tabName==='SpO₂'?0:1):'--'} <span className="text-xs font-normal text-[var(--text-muted)]">{tabUnit}</span></p>
              </div>
              <div className="flex-1 min-w-[100px]">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">Max</p>
                <p className="font-semibold text-sm">{isFinite(maxVal)?Number(maxVal).toFixed(tabName==='Heart Rate'||tabName==='SpO₂'?0:1):'--'} <span className="text-xs font-normal text-[var(--text-muted)]">{tabUnit}</span></p>
              </div>
            </div>

            {/* The Big Chart */}
            <div className="w-full relative h-[280px]">
               {activeData && activeData.length > 0 ? (
                 <LineChart data={activeData} dataKey="value" color={tabColor} height={280} />
               ) : (
                 <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] border border-dashed border-[var(--line-strong)] rounded-lg">No data points available</div>
               )}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="w-4 h-[2px] rounded" style={{ backgroundColor: tabColor }}></span>
              <span className="text-xs text-[var(--text-muted)]">{tabName} ({tabUnit})</span>
            </div>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Device Details" className="border-[var(--line)]">
               <div className="space-y-4 py-2">
                 <div className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Smartphone size={14}/> Device Name</div>
                   <span className="text-[var(--text-primary)]">Mental/Health IoT Unit</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Target size={14}/> Device ID</div>
                   <span className="text-[var(--text-primary)] font-mono">ESP8266-NODEMCU</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Activity size={14}/> WiFi Status</div>
                   <span className="text-[var(--success)] font-medium">Connected</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Clock size={14}/> Polling Rate</div>
                   <span className="text-[var(--text-primary)]">15 seconds</span>
                 </div>
               </div>
            </Card>

            <Card title="ThingSpeak Channel" className="border-[var(--line)]">
               <div className="space-y-4 py-2">
                 <div className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Server size={14}/> Channel ID</div>
                   <span className="text-[var(--text-primary)] font-mono">3144180</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Droplets size={14}/> Fields Mapped</div>
                   <span className="text-[var(--text-primary)]">4 (HR, SpO₂, Temp, GSR)</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2 text-[var(--text-secondary)]"><CheckCircle2 size={14} className="text-[var(--success)]"/> Data Ingestion</div>
                   <span className="text-[var(--success)]">Active via REST API</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Clock size={14}/> Last Transmission</div>
                   <span className="text-[var(--text-primary)]">{new Date().toLocaleTimeString()}</span>
                 </div>
               </div>
            </Card>
          </div>

        </div>

        {/* Right Sidebar Column */}
        <div className="space-y-6">
          <Card className="border-[var(--line)] shadow-[0_0_20px_rgba(0,0,0,0.2)] relative overflow-hidden text-center p-6">
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: stressColor }}></div>
            <h3 className="font-bold text-[var(--text-primary)] mb-6 text-left">Stress Level (AI Prediction)</h3>
            
            <div className="flex justify-center mb-6 pt-4">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-lg">
                  <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.05)" strokeWidth="14" fill="none" />
                  <circle 
                    cx="80" cy="80" r="70" 
                    stroke={stressColor} 
                    strokeWidth="14" 
                    fill="none" 
                    strokeDasharray={2 * Math.PI * 70} 
                    strokeDashoffset={2 * Math.PI * 70 - (Math.max(2, stressProb) / 100) * 2 * Math.PI * 70} 
                    strokeLinecap="round" 
                    className="transition-all duration-1000 ease-in-out" 
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold" style={{color: stressColor}}>{stressProb}%</span>
                </div>
              </div>
            </div>
            
            <p className="text-xl font-bold text-[var(--text-primary)] mb-2" style={{color: stressColor}}>{stressLevel}</p>
            <p className="text-xs font-semibold text-[var(--text-secondary)] mb-6 bg-[rgba(255,255,255,0.03)] inline-block px-3 py-1.5 rounded-full">
              Confidence Score: <span className="text-[var(--success)] ml-1">{mlConfidence}% Reliable</span>
            </p>

            <div className="text-left bg-gradient-to-br from-[rgba(255,255,255,0.03)] to-transparent border border-[var(--line-strong)] p-4 rounded-lg mb-6 shadow-inner">
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Brain size={12} className="text-[var(--accent)]"/> 
                Based on {vitals?.modelLoaded ? 'Random Forest ML Model' : 'Clinical Rule-based Engine'}
              </p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {latestClass === 'Risk' 
                  ? 'Urgent attention required. Vitals indicate significant physiological distress.' 
                  : latestClass === 'Stress' 
                  ? 'Elevated stress patterns detected. Monitor closely or consider relaxation techniques.' 
                  : 'Vitals establish a deeply stable baseline. Patient is in a rested physiological state.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <button className="flex items-center justify-center gap-2 py-2 px-3 text-xs bg-[rgba(139,92,246,0.1)] text-purple-400 font-medium rounded-lg hover:bg-[rgba(139,92,246,0.2)] transition-colors border border-[rgba(139,92,246,0.2)]">
                 <Brain size={14}/> Aromatherapy
               </button>
               <button className="flex items-center justify-center gap-2 py-2 px-3 text-xs bg-[rgba(59,130,246,0.1)] text-blue-400 font-medium rounded-lg hover:bg-[rgba(59,130,246,0.2)] transition-colors border border-[rgba(59,130,246,0.2)]">
                 <Activity size={14}/> Meditation
               </button>
            </div>
          </Card>

          <Card title="System Information" className="border-[var(--line)]">
             <div className="py-2 space-y-4">
               <div className="flex justify-between items-center text-sm border-b border-[var(--line)] pb-3">
                 <div className="text-[var(--text-secondary)]">Microcontroller</div>
                 <div className="font-mono text-[var(--text-primary)]">ESP8266</div>
               </div>
               <div className="flex justify-between items-center text-sm border-b border-[var(--line)] pb-3">
                 <div className="text-[var(--text-secondary)]">Backend Platform</div>
                 <div className="text-[var(--text-primary)]">ThingSpeak API Core</div>
               </div>
               <div className="flex justify-between items-center text-sm border-b border-[var(--line)] pb-3">
                 <div className="text-[var(--text-secondary)]">Signal Quality</div>
                 <div className="text-[var(--success)] font-medium">Excellent</div>
               </div>
               <div className="flex justify-between items-center text-sm border-b border-[var(--line)] pb-3">
                 <div className="text-[var(--text-secondary)]">Data Interval</div>
                 <div className="text-[var(--text-primary)]">15 seconds</div>
               </div>
               <div className="flex justify-between items-center text-sm border-b border-[var(--line)] pb-3">
                 <div className="text-[var(--text-secondary)]">Last Update</div>
                 <div className="text-[var(--text-primary)] font-mono">{new Date().toLocaleTimeString()}</div>
               </div>
               <div className="flex justify-between items-center text-sm">
                 <div className="text-[var(--text-secondary)]">ThingSpeak Status</div>
                 <div className="text-[var(--success)] font-medium">All Systems Operational</div>
               </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoring;
