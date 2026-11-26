'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { api, ApiClientError } from '@/lib/api';
import { formatRelativeTime, formatTicketCode } from '@/lib/format';
import {
  DashboardStats,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/lib/types';
import { duration, ease } from '@/motion/tokens';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import {
  CategoryIcon,
  PriorityIndicator,
  StatusLozenge,
} from '@/components/ui/Lozenge';
import { Skeleton } from '@/components/ui/Skeleton';

export default function SummaryPage() {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setError(null);
      const res = await api.dashboard.stats();
      setStats(res.data.stats);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to load summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => loadStats();
    socket.on('ticket:event', refresh);
    socket.on('ticket:deleted', refresh);
    return () => {
      socket.off('ticket:event', refresh);
      socket.off('ticket:deleted', refresh);
    };
  }, [socket, loadStats]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-sm border border-line bg-surface p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-16" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-sm border border-line-danger bg-surface p-6 text-center">
        <p className="text-[14px] font-medium text-ink-danger">{error}</p>
        <Button
          variant="primary"
          className="mt-3"
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={loadStats}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  const kpis = [
    {
      label: user?.role === 'ADMIN' ? 'Total Tickets' : 'My Tickets',
      value: stats.total,
      sub: `${stats.statusCounts.CLOSED} closed`,
      icon: Layers,
      href: '/dashboard/tickets',
    },
    {
      label: 'Open',
      value: stats.statusCounts.OPEN,
      sub: 'Waiting for triage',
      icon: AlertCircle,
      href: '/dashboard/tickets?status=OPEN',
    },
    {
      label: 'In Progress',
      value: stats.statusCounts.IN_PROGRESS,
      sub: 'Active work',
      icon: Clock,
      href: '/dashboard/tickets?status=IN_PROGRESS',
    },
    {
      label: 'Done Rate',
      value: `${stats.resolutionRate}%`,
      sub: `${stats.statusCounts.RESOLVED + stats.statusCounts.CLOSED} resolved or closed`,
      icon: CheckCircle2,
      href: '/dashboard/tickets?status=RESOLVED',
    },
  ];

  const statusOrder: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  const priorityOrder: TicketPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
  const categoryOrder: TicketCategory[] = [
    'TECHNICAL',
    'BILLING',
    'ACCOUNT',
    'FEATURE_REQUEST',
    'GENERAL',
  ];

  const statusBarColor: Record<TicketStatus, string> = {
    OPEN: 'var(--lozenge-neutral-fg)',
    IN_PROGRESS: 'var(--color-brand)',
    RESOLVED: 'var(--text-success)',
    CLOSED: 'var(--lozenge-purple-fg)',
  };

  const priorityBarColor: Record<TicketPriority, string> = {
    URGENT: 'var(--priority-highest)',
    HIGH: 'var(--priority-high)',
    MEDIUM: 'var(--priority-medium)',
    LOW: 'var(--priority-low)',
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: duration.moderate,
                delay: idx * 0.05,
                ease: ease.out,
              }}
            >
              <Link
                href={kpi.href}
                className="block rounded-sm border border-line bg-surface p-4 transition-colors duration-[80ms] hover:bg-surface-hover"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
                    {kpi.label}
                  </span>
                  <Icon className="h-4 w-4 text-ink-subtlest" />
                </div>
                <p className="mt-2 text-[24px] font-semibold leading-[28px] text-ink">
                  {kpi.value}
                </p>
                <p className="mt-1 text-[12px] text-ink-subtlest">{kpi.sub}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Section 9: 2-Column Summary Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status Overview */}
        <div className="rounded-sm border border-line bg-surface p-4">
          <h2 className="text-[16px] font-medium text-ink">Status overview</h2>
          <p className="mt-0.5 text-[12px] text-ink-subtlest">
            Click a status bar to filter issues in List view
          </p>

          <div className="mt-4 space-y-3">
            {statusOrder.map((status, idx) => {
              const count = stats.statusCounts[status];
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <Link
                  key={status}
                  href={`/dashboard/tickets?status=${status}`}
                  className="block rounded-sm p-1 transition-colors duration-[80ms] hover:bg-surface-hover"
                >
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="font-medium text-ink">{status.replace('_', ' ')}</span>
                    <span className="text-ink-subtlest">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded bg-surface-pressed">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{
                        duration: 0.6,
                        delay: idx * 0.06,
                        ease: ease.standard,
                      }}
                      style={{ backgroundColor: statusBarColor[status] }}
                      className="h-full rounded"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="rounded-sm border border-line bg-surface p-4">
          <h2 className="text-[16px] font-medium text-ink">Priority breakdown</h2>
          <p className="mt-0.5 text-[12px] text-ink-subtlest">
            Distribution of urgency across active support tickets
          </p>

          <div className="mt-4 space-y-3">
            {priorityOrder.map((priority, idx) => {
              const count = stats.priorityCounts[priority];
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <Link
                  key={priority}
                  href={`/dashboard/tickets?priority=${priority}`}
                  className="block rounded-sm p-1 transition-colors duration-[80ms] hover:bg-surface-hover"
                >
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <PriorityIndicator priority={priority} showLabel />
                    <span className="text-ink-subtlest">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded bg-surface-pressed">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{
                        duration: 0.6,
                        delay: idx * 0.06,
                        ease: ease.standard,
                      }}
                      style={{ backgroundColor: priorityBarColor[priority] }}
                      className="h-full rounded"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Types of Work (Categories) */}
        <div className="rounded-sm border border-line bg-surface p-4">
          <h2 className="text-[16px] font-medium text-ink">Types of work</h2>
          <p className="mt-0.5 text-[12px] text-ink-subtlest">
            Support volume grouped by ticket category
          </p>

          <div className="mt-4 space-y-2.5">
            {categoryOrder.map((category, idx) => {
              const count = stats.categoryCounts[category];
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <Link
                  key={category}
                  href={`/dashboard/tickets?category=${category}`}
                  className="flex items-center gap-3 rounded-sm p-1.5 transition-colors duration-[80ms] hover:bg-surface-hover"
                >
                  <CategoryIcon category={category} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex justify-between text-[12px]">
                      <span className="font-medium text-ink">
                        {category.replace('_', ' ')}
                      </span>
                      <span className="text-ink-subtlest">{count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded bg-surface-pressed">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{
                          duration: 0.5,
                          delay: idx * 0.05,
                          ease: ease.standard,
                        }}
                        className="h-full rounded bg-brand"
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="rounded-sm border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-medium text-ink">Recent activity</h2>
              <p className="mt-0.5 text-[12px] text-ink-subtlest">
                Latest tickets updated in real time
              </p>
            </div>
            <Link
              href="/dashboard/board"
              className="text-[12px] font-medium text-ink-link hover:underline"
            >
              Open board
            </Link>
          </div>

          <div className="mt-3 divide-y divide-line">
            {stats.recentTickets.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-ink-subtlest">
                No tickets submitted yet.
              </p>
            ) : (
              stats.recentTickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/tickets/${t.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 transition-colors duration-[80ms] hover:bg-surface-hover px-1 rounded-sm"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={t.createdBy.name} size={24} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[12px] text-ink-subtlest">
                          {formatTicketCode(t.ticketNumber)}
                        </span>
                        <span className="truncate text-[13px] font-medium text-ink">
                          {t.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-subtlest">
                        {t.createdBy.name} · {formatRelativeTime(t.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <StatusLozenge status={t.status} />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
