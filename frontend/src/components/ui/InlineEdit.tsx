'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { duration, ease } from '@/motion/tokens';

export function InlineEdit({
  value,
  onSave,
  disabled = false,
  multiline = false,
  placeholder = 'Click to edit...',
  textClassName = 'text-[14px] text-ink',
}: {
  value: string;
  onSave: (nextValue: string) => Promise<void> | void;
  disabled?: boolean;
  multiline?: boolean;
  placeholder?: string;
  textClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const commit = async () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === value) {
      setDraft(value);
      return;
    }

    setSaving(true);
    try {
      await onSave(trimmed);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1100);
    } catch {
      setDraft(value);
    } finally {
      setSaving(false);
    }
  };

  if (editing && !disabled) {
    const sharedClass =
      'w-full rounded-sm border-2 border-line-focus bg-surface px-2 py-1 text-ink transition-colors duration-[80ms]';

    return multiline ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        rows={4}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            commit();
          }
        }}
        className={`${sharedClass} text-[14px] leading-relaxed`}
      />
    ) : (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`${sharedClass} ${textClassName}`}
      />
    );
  }

  return (
    <div className="group relative flex items-start gap-2">
      <button
        type="button"
        disabled={disabled || saving}
        onClick={() => !disabled && setEditing(true)}
        className={`w-full rounded-sm px-1.5 py-1 text-left transition-colors duration-[80ms] ${
          disabled
            ? 'cursor-default'
            : 'cursor-text hover:bg-surface-hover'
        } ${textClassName}`}
      >
        {value || <span className="text-ink-disabled">{placeholder}</span>}
      </button>

      <AnimatePresence>
        {savedFlash && (
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.fast, ease: ease.out }}
            className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-ink-success"
            style={{ backgroundColor: 'var(--lozenge-green-bg)' }}
          >
            <Check className="h-3 w-3" />
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
