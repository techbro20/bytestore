'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Check } from 'lucide-react';

type ToastContextValue = {
  notify: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const notify = useCallback((next: string) => {
    setMessage(next);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(false), 2200);
    return () => window.clearTimeout(t);
  }, [visible, message]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-0 top-16 z-[60] flex justify-center px-4 transition-all duration-300 md:top-20 ${
          visible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-2 opacity-0'
        }`}
      >
        {message ? (
          <div className="pointer-events-auto inline-flex max-w-sm items-center gap-2 rounded-full border border-orange-300/50 bg-neutral-950/90 px-4 py-2.5 text-sm text-white shadow-lg backdrop-blur-md dark:border-orange-500/30">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span>{message}</span>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
