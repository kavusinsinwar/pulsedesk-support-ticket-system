'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertOctagon,
  ArrowDown,
  ArrowUp,
  Bug,
  ChevronDown,
  CreditCard,
  Equal,
  HelpCircle,
  Sparkles,
  UserCog,
} from 'lucide-react';
import { spring } from '@/motion/tokens';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/lib/types';

export type LozengeAppearance =
  | 'neutral'
  | 'blue'
  | 'green'
  | 'red'
  | 'yellow'
  | 'purple';

const APPEARANCE_STYLES: Record<LozengeAppearance, React.CSSProperties> = {
  neutral: { backgroundColor: 'var(--lozenge-neutral-bg)', color: 'var(--lozenge-neutral-fg)' },
  blue: { backgroundColor: 'var(--lozenge-blue-bg)', color: 'var(--lozenge-blue-fg)' },
  green: { backgroundColor: 'var(--lozenge-green-bg)', color: 'var(--lozenge-green-fg)' },
  red: { backgroundColor: 'var(--lozenge-red-bg)', color: 'var(--lozenge-red-fg)' },
  yellow: { backgroundColor: 'var(--lozenge-yellow-bg)', color: 'var(--lozenge-yellow-fg)' },
  purple: { backgroundColor: 'var(--lozenge-purple-bg)', color: 'var(--lozenge-purple-fg)' },
};

export const STATUS_APPEARANCE: Record<TicketStatus, LozengeAppearance> = {
  OPEN: 'neutral',
  IN_PROGRESS: 'blue',
  RESOLVED: 'green',
  CLOSED: 'purple',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
};

export function Lozenge({
  appearance = 'neutral',
  children,
  animateKey,
  className = '',
}: {
  appearance?: LozengeAppearance;
  children: React.ReactNode;
  animateKey?: string;
  className?: string;
}) {
  return (
    <motion.span
      key={animateKey}
      initial={animateKey ? { scale: 0.92, opacity: 0.75 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={spring.pop}
      style={APPEARANCE_STYLES[appearance]}
      className={`inline-flex h-4 max-w-[200px] items-center truncate rounded-sm px-1.5 text-[11px] font-bold uppercase tracking-[0.04em] leading-none transition-colors duration-[180ms] ${className}`}
    >
      {children}
    </motion.span>
  );
}

export function StatusLozenge({
  status,
  interactive = false,
  onClick,
}: {
  status: TicketStatus;
  interactive?: boolean;
  onClick?: () => void;
}) {
  const appearance = STATUS_APPEARANCE[status];

  if (!interactive) {
    return (
      <Lozenge appearance={appearance} animateKey={status}>
        {STATUS_LABELS[status]}
      </Lozenge>
    );
  }

  return (
    <motion.button
      type="button"
      key={status}
      initial={{ scale: 0.92, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.97 }}
      transition={spring.pop}
      onClick={onClick}
      style={APPEARANCE_STYLES[appearance]}
      className="inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-[12px] font-bold uppercase tracking-[0.04em] transition-all duration-[180ms] hover:brightness-95"
    >
      <span>{STATUS_LABELS[status]}</span>
      <ChevronDown className="h-3.5 w-3.5" />
    </motion.button>
  );
}

export function CategoryIcon({ category }: { category: TicketCategory }) {
  switch (category) {
    case 'TECHNICAL':
      return (
        <span
          title="Technical"
          className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-white"
          style={{ backgroundColor: 'var(--type-bug)' }}
        >
          <Bug className="h-2.5 w-2.5" />
        </span>
      );
    case 'BILLING':
      return (
        <span
          title="Billing"
          className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-white"
          style={{ backgroundColor: 'var(--type-task)' }}
        >
          <CreditCard className="h-2.5 w-2.5" />
        </span>
      );
    case 'ACCOUNT':
      return (
        <span
          title="Account"
          className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-white"
          style={{ backgroundColor: 'var(--type-epic)' }}
        >
          <UserCog className="h-2.5 w-2.5" />
        </span>
      );
    case 'FEATURE_REQUEST':
      return (
        <span
          title="Feature Request"
          className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-white"
          style={{ backgroundColor: 'var(--type-story)' }}
        >
          <Sparkles className="h-2.5 w-2.5" />
        </span>
      );
    default:
      return (
        <span
          title="General"
          className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-white"
          style={{ backgroundColor: 'var(--type-subtask)' }}
        >
          <HelpCircle className="h-2.5 w-2.5" />
        </span>
      );
  }
}

export function PriorityIndicator({
  priority,
  showLabel = false,
}: {
  priority: TicketPriority;
  showLabel?: boolean;
}) {
  const map: Record<
    TicketPriority,
    { color: string; label: string; icon: React.ReactNode }
  > = {
    URGENT: {
      color: 'var(--priority-highest)',
      label: 'Urgent',
      icon: <AlertOctagon className="h-3.5 w-3.5" />,
    },
    HIGH: {
      color: 'var(--priority-high)',
      label: 'High',
      icon: <ArrowUp className="h-3.5 w-3.5" />,
    },
    MEDIUM: {
      color: 'var(--priority-medium)',
      label: 'Medium',
      icon: <Equal className="h-3.5 w-3.5" />,
    },
    LOW: {
      color: 'var(--priority-low)',
      label: 'Low',
      icon: <ArrowDown className="h-3.5 w-3.5" />,
    },
  };

  const item = map[priority];

  return (
    <span
      title={`Priority: ${item.label}`}
      style={{ color: item.color }}
      className="inline-flex items-center gap-1 text-[12px] font-medium"
    >
      {item.icon}
      {showLabel && <span className="text-ink-subtle">{item.label}</span>}
    </span>
  );
}
