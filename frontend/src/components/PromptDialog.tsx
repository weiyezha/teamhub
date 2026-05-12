import { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';

interface PromptDialogProps {
  open: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  open,
  title,
  placeholder = '',
  defaultValue = '',
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, defaultValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') onConfirm(value);
      if (e.key === 'Escape') onCancel();
    },
    [value, onConfirm, onCancel]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-bg-primary rounded-modal w-full max-w-sm p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent mb-4"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => onConfirm(value)}
            className="px-4 py-2 rounded-btn text-sm text-white bg-accent hover:bg-accent-hover transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
