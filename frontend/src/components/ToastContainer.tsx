import { useToast } from '../hooks/useToast';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-btn shadow-lg text-sm min-w-[200px] max-w-[320px] animate-fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-500/10 text-rose-600 border border-rose-200'
              : 'bg-bg-secondary text-text-primary border border-border'
          }`}
        >
          {toast.type === 'success' && <CheckCircle size={16} />}
          {toast.type === 'error' && <AlertCircle size={16} />}
          {toast.type === 'info' && <Info size={16} />}
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
