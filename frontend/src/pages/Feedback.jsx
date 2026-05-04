import { Card } from '../components/common/Card';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';

const Feedback = () => {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Clinical Feedback Model</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">Help refine the ML inference engine by comparing predictions against your clinical assessment.</p>
      </div>

      <div className="max-w-3xl">
        <Card title="Pending Expert Reviews" subtitle="Review AI evaluations">
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[var(--line)] hover:border-[var(--line-accent)] transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--accent)] mb-1">Inference ID: #INF-883492</p>
                  <p className="text-xs text-[var(--text-muted)]">Generated 2 minutes ago • Patient: Unknown</p>
                </div>
                <div className="px-3 py-1 bg-[var(--danger-soft)] text-[var(--danger)] rounded-full text-xs font-bold border border-[rgba(244,63,94,0.2)]">AI Prediction: Critical Risk</div>
              </div>

              <div className="flex gap-4">
                <button className="flex-1 primary-button bg-[var(--success-soft)] text-[var(--success)] hover:bg-[var(--success)] hover:text-white transition-colors border-[var(--success)] shadow-none flex items-center justify-center gap-2">
                  <ThumbsUp size={16} />
                  Accurate
                </button>
                <button className="flex-1 primary-button bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-colors border-[var(--danger)] shadow-none flex items-center justify-center gap-2">
                  <ThumbsDown size={16} />
                  False Alarm
                </button>
              </div>
            </div>

            <div className="text-center py-6 text-[var(--text-muted)] border-t border-[var(--line-strong)]">
              <MessageSquare className="mx-auto mb-3 opacity-50" size={24} />
              <p className="text-sm">No other pending reviews.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Feedback;
