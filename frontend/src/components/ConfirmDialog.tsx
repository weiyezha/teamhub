import { useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  const btnColors =
    variant === 'danger'
      ? 'bg-rose-500 hover:bg-rose-600'
      : variant === 'warning'
      ? 'bg-amber-500 hover:bg-amber-600'
      : 'bg-accent hover:bg-accent-hover';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-bg-primary rounded-modal w-full max-w-sm p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle
            size={20}
            className={
              variant === 'danger'
                ? 'text-rose-500'
                : variant === 'warning'
                ? 'text-amber-500'
                : 'text-accent'
            }
          />
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        </div>
        <p className="text-sm text-text-secondary mb-5">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-btn text-sm text-white transition-colors ${btnColors}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
