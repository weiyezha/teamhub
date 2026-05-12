import { useState, useCallback, useRef, useEffect } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const listeners: Set<(toasts: ToastMessage[]) => void> = new Set();
let globalToasts: ToastMessage[] = [];

function notify() {
  listeners.forEach((cb) => cb([...globalToasts]));
}

export function showToast(message: string, type: ToastMessage['type'] = 'info') {
  const safeMessage = typeof message === 'string' ? message : JSON.stringify(message);
  const id = Math.random().toString(36).slice(2, 9);
  globalToasts = [{ id, message: safeMessage, type }, ...globalToasts].slice(0, 5);
  notify();
  setTimeout(() => {
    globalToasts = globalToasts.filter((t) => t.id !== id);
    notify();
  }, 3000);
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>(globalToasts);
  const toastsRef = useRef(toasts);
  toastsRef.current = toasts;

  useEffect(() => {
    const cb = (t: ToastMessage[]) => setToasts(t);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    globalToasts = globalToasts.filter((t) => t.id !== id);
    notify();
  }, []);

  return { toasts, removeToast };
}
