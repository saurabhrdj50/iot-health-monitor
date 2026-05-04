import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const ErrorState = ({ message = "Failed to load data", onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-[var(--danger)] bg-[rgba(244,63,94,0.05)] animate-fade-in-up">
      <div className="w-12 h-12 rounded-full bg-[var(--danger-soft)] flex items-center justify-center mb-4">
        <AlertCircle className="text-[var(--danger)]" size={24} />
      </div>
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Something went wrong</h3>
      <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm">
        {message}
      </p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-light)] hover:bg-[var(--line-strong)] text-[var(--text-primary)] rounded border border-[var(--line)] transition-colors"
        >
          <RefreshCw size={16} />
          Retry Connection
        </button>
      )}
    </div>
  );
};

export default ErrorState;
