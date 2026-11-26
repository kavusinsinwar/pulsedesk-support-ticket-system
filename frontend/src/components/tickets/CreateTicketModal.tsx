'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { api, ApiClientError } from '@/lib/api';
import { formatTicketCode } from '@/lib/format';
import { TicketCategory, TicketPriority } from '@/lib/types';
import { duration, ease } from '@/motion/tokens';
import { Button } from '@/components/ui/Button';

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTicketModal({ open, onClose, onCreated }: CreateTicketModalProps) {
  const { pushToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('TECHNICAL');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, submitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await api.tickets.create({ title, description, category, priority });
      const code = formatTicketCode(res.data.ticket.ticketNumber);
      pushToast({
        variant: 'success',
        title: `${code} created`,
        description: res.data.ticket.title,
      });
      setTitle('');
      setDescription('');
      setCategory('TECHNICAL');
      setPriority('MEDIUM');
      onCreated();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.details?.[0]?.message || err.message);
      } else {
        setError('Failed to create ticket');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[600] flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--bg-blanket)' }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: duration.moderate, ease: ease.out }}
            className="flex max-h-[calc(100vh-120px)] w-full max-w-[600px] flex-col overflow-hidden rounded-lg bg-surface-overlay shadow-overlay"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 className="text-[20px] font-medium text-ink">Create ticket</h2>
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="rounded-sm p-1.5 text-ink-subtle transition-colors duration-[80ms] hover:bg-surface-hover hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-6">
              {error && (
                <div
                  className="rounded-sm border border-line-danger px-3 py-2 text-[13px] text-ink-danger"
                  style={{ backgroundColor: 'var(--lozenge-red-bg)' }}
                >
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-ink-subtle">
                    Category <span className="text-ink-danger">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                    className="h-8 w-full rounded-sm border-2 border-line bg-surface px-2 text-[14px] text-ink transition-colors duration-[80ms] hover:bg-surface-hover focus:border-line-focus focus:bg-surface"
                  >
                    <option value="TECHNICAL">Technical</option>
                    <option value="BILLING">Billing</option>
                    <option value="ACCOUNT">Account</option>
                    <option value="FEATURE_REQUEST">Feature Request</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-ink-subtle">
                    Priority <span className="text-ink-danger">*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="h-8 w-full rounded-sm border-2 border-line bg-surface px-2 text-[14px] text-ink transition-colors duration-[80ms] hover:bg-surface-hover focus:border-line-focus focus:bg-surface"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[12px] font-semibold text-ink-subtle">
                    Summary <span className="text-ink-danger">*</span>
                  </label>
                  <span className="text-[11px] text-ink-subtlest">{title.length}/150</span>
                </div>
                <input
                  type="text"
                  required
                  minLength={5}
                  maxLength={150}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short summary of the issue"
                  className="h-8 w-full rounded-sm border-2 border-line bg-surface px-2 text-[14px] text-ink transition-colors duration-[80ms] hover:bg-surface-hover focus:border-line-focus focus:bg-surface"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-ink-subtle">
                  Description <span className="text-ink-danger">*</span>
                </label>
                <textarea
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Steps to reproduce, expected result, and relevant details..."
                  className="w-full rounded-sm border-2 border-line bg-surface p-2 text-[14px] text-ink transition-colors duration-[80ms] hover:bg-surface-hover focus:border-line-focus focus:bg-surface"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <Button variant="subtle" disabled={submitting} onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={submitting}>
                  Create
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
