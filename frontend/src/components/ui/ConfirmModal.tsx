'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { duration, ease } from '@/motion/tokens';
import { Button } from './Button';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[750] flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--bg-blanket)' }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !loading) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: duration.moderate, ease: ease.out }}
            className="w-full max-w-[400px] rounded-lg bg-surface-overlay p-6 shadow-overlay"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-danger"
                  style={{ backgroundColor: 'var(--lozenge-red-bg)' }}
                >
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-[16px] font-medium text-ink">{title}</h3>
                  <p className="mt-1.5 text-[14px] text-ink-subtle">{description}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="rounded-sm p-1 text-ink-subtlest hover:bg-surface-hover hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="subtle" disabled={loading} onClick={onClose}>
                Cancel
              </Button>
              <Button variant="danger" loading={loading} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
