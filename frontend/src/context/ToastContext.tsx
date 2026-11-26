'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, Radio, X } from 'lucide-react';
import { duration, ease, spring } from '@/motion/tokens';

type ToastVariant = 'success' | 'error' | 'info' | 'realtime';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  action?: ToastAction;
}

interface ToastContextValue {
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const LEFT_BAR_COLORS: Record<ToastVariant, string> = {
  success: 'border-l-[#216E4E]',
  error: 'border-l-[#AE2E24]',
  info: 'border-l-[#0C66E4]',
  realtime: 'border-l-[#5E4DB2]',
};

const VARIANT_ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 shrink-0 text-ink-success" />,
  error: <AlertCircle className="h-4 w-4 shrink-0 text-ink-danger" />,
  info: <Info className="h-4 w-4 shrink-0 text-brand" />,
  realtime: <Radio className="h-4 w-4 shrink-0 text-[#5E4DB2] animate-pulse" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      setTimeout(() => removeToast(id), 8000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      {/* Section 4.11: Bottom-left flag stack, 400px wide, z-index 800 */}
      <div className="pointer-events-none fixed bottom-5 left-5 z-[800] flex w-[calc(100vw-40px)] max-w-[400px] flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{
                duration: duration.moderate,
                ease: ease.out,
                layout: spring.layout,
              }}
              className={`pointer-events-auto flex items-start gap-3 rounded-sm border border-line border-l-4 bg-surface-overlay p-3.5 text-ink shadow-overlay ${LEFT_BAR_COLORS[toast.variant]}`}
            >
              <div className="mt-0.5">{VARIANT_ICONS[toast.variant]}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-ink">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 text-[12px] text-ink-subtle">{toast.description}</p>
                )}
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick();
                      removeToast(toast.id);
                    }}
                    className="mt-1.5 text-[12px] font-medium text-ink-link hover:underline"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-sm p-1 text-ink-subtlest transition-colors duration-[80ms] hover:bg-surface-hover hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
