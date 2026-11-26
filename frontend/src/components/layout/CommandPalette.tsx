'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Kanban,
  LayoutDashboard,
  List,
  Moon,
  Plus,
  Search,
  Sun,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';
import { formatTicketCode } from '@/lib/format';
import { Ticket } from '@/lib/types';
import { duration, ease, spring } from '@/motion/tokens';
import { CategoryIcon, StatusLozenge } from '@/components/ui/Lozenge';
import { Skeleton } from '@/components/ui/Skeleton';

interface CommandItem {
  id: string;
  group: 'Tickets' | 'Navigation' | 'Actions';
  label: string;
  ticket?: Ticket;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onOpenCreate,
}: {
  open: boolean;
  onClose: () => void;
  onOpenCreate: () => void;
}) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await api.tickets.list({
          search: query.trim() || undefined,
          limit: 6,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        });
        if (!cancelled) {
          setTickets(res.data);
        }
      } catch {
        if (!cancelled) setTickets([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  const items: CommandItem[] = [
    ...tickets.map((t) => ({
      id: `ticket-${t.id}`,
      group: 'Tickets' as const,
      label: `${formatTicketCode(t.ticketNumber)} ${t.title}`,
      ticket: t,
      onSelect: () => {
        onClose();
        router.push(`/dashboard/tickets/${t.id}`);
      },
    })),
    {
      id: 'nav-board',
      group: 'Navigation',
      label: 'Go to Kanban Board',
      icon: <Kanban className="h-4 w-4 text-ink-subtle" />,
      onSelect: () => {
        onClose();
        router.push('/dashboard/board');
      },
    },
    {
      id: 'nav-summary',
      group: 'Navigation',
      label: 'Go to Project Summary',
      icon: <LayoutDashboard className="h-4 w-4 text-ink-subtle" />,
      onSelect: () => {
        onClose();
        router.push('/dashboard');
      },
    },
    {
      id: 'nav-list',
      group: 'Navigation',
      label: 'Go to Issue List',
      icon: <List className="h-4 w-4 text-ink-subtle" />,
      onSelect: () => {
        onClose();
        router.push('/dashboard/tickets');
      },
    },
    {
      id: 'action-create',
      group: 'Actions',
      label: 'Create new support ticket',
      icon: <Plus className="h-4 w-4 text-brand" />,
      onSelect: () => {
        onClose();
        onOpenCreate();
      },
    },
    {
      id: 'action-theme',
      group: 'Actions',
      label: theme === 'light' ? 'Switch to Dark theme' : 'Switch to Light theme',
      icon:
        theme === 'light' ? (
          <Moon className="h-4 w-4 text-ink-subtle" />
        ) : (
          <Sun className="h-4 w-4 text-ink-subtle" />
        ),
      onSelect: () => {
        toggleTheme();
        onClose();
      },
    },
  ];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) =>
          items.length > 0 ? (prev - 1 + items.length) % items.length : 0
        );
      } else if (e.key === 'Enter' && items[activeIndex]) {
        e.preventDefault();
        items[activeIndex].onSelect();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, items, activeIndex, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.fast }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-[600] flex items-start justify-center pt-[12vh] px-4"
          style={{ backgroundColor: 'var(--bg-blanket)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: duration.base, ease: ease.out }}
            className="w-full max-w-[640px] overflow-hidden rounded-lg border border-line bg-surface-overlay shadow-overlay"
          >
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <Search className="h-4 w-4 text-ink-subtlest" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Search tickets by title, description, or jump to a view..."
                className="w-full bg-transparent text-[14px] text-ink placeholder:text-ink-disabled focus:outline-none"
              />
              <kbd className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[11px] text-ink-subtlest">
                ESC
              </kbd>
            </div>

            <div className="max-h-[380px] overflow-y-auto p-2">
              {loading ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <p className="py-8 text-center text-[14px] text-ink-subtle">
                  No matches. Try a different keyword.
                </p>
              ) : (
                <div className="space-y-1">
                  {items.map((item, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={item.onSelect}
                        className="relative flex w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-[14px]"
                      >
                        {isActive && (
                          <motion.span
                            layoutId="cmdk-active-row"
                            transition={spring.layout}
                            className="absolute inset-0 rounded-sm bg-brand-subtle"
                          />
                        )}
                        <span className="relative z-10 flex min-w-0 items-center gap-2.5">
                          {item.ticket ? (
                            <CategoryIcon category={item.ticket.category} />
                          ) : (
                            item.icon
                          )}
                          {item.ticket && (
                            <span className="shrink-0 font-mono text-[12px] text-ink-subtlest">
                              {formatTicketCode(item.ticket.ticketNumber)}
                            </span>
                          )}
                          <span className="truncate text-ink">
                            {item.ticket ? item.ticket.title : item.label}
                          </span>
                        </span>
                        {item.ticket ? (
                          <span className="relative z-10 shrink-0">
                            <StatusLozenge status={item.ticket.status} />
                          </span>
                        ) : (
                          <span className="relative z-10 text-[11px] uppercase tracking-wider text-ink-subtlest">
                            {item.group}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
