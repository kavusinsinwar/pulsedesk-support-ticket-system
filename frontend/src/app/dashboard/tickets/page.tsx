'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { api, ApiClientError } from '@/lib/api';
import { formatRelativeTime, formatTicketCode } from '@/lib/format';
import {
  PaginationMeta,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/lib/types';
import { duration, ease } from '@/motion/tokens';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import {
  CategoryIcon,
  Lozenge,
  PriorityIndicator,
  StatusLozenge,
} from '@/components/ui/Lozenge';
import { Skeleton } from '@/components/ui/Skeleton';
import { CreateTicketModal } from '@/components/tickets/CreateTicketModal';
import { TicketModal } from '@/components/tickets/TicketModal';

function ListContent() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState<TicketStatus | ''>(
    (searchParams.get('status') as TicketStatus) || ''
  );
  const [priority, setPriority] = useState<TicketPriority | ''>(
    (searchParams.get('priority') as TicketPriority) || ''
  );
  const [category, setCategory] = useState<TicketCategory | ''>(
    (searchParams.get('category') as TicketCategory) || ''
  );
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'priority' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const selectedTicketId = searchParams.get('selectedIssue');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.tickets.list({
        search: search.trim() || undefined,
        status,
        priority,
        category,
        sortBy,
        sortOrder,
        page,
        limit: 10,
      });
      setTickets(res.data);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to load tickets');
    } finally {
      setLoading(false);
    }
  }, [search, status, priority, category, sortBy, sortOrder, page]);

  useEffect(() => {
    const t = setTimeout(() => fetchTickets(), 150);
    return () => clearTimeout(t);
  }, [fetchTickets]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchTickets();
    socket.on('ticket:event', refresh);
    socket.on('ticket:deleted', refresh);
    return () => {
      socket.off('ticket:event', refresh);
      socket.off('ticket:deleted', refresh);
    };
  }, [socket, fetchTickets]);

  const toggleSort = (field: 'createdAt' | 'updatedAt' | 'priority' | 'status') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const hasFilters = Boolean(search || status || priority || category);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-ink-subtlest" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search issues..."
              className="h-8 w-52 rounded-sm border-2 border-line bg-surface pl-8 pr-2 text-[13px] text-ink transition-colors duration-[80ms] hover:bg-surface-hover focus:border-line-focus focus:bg-surface"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as TicketStatus | '');
              setPage(1);
            }}
            className="h-8 rounded-sm border border-line bg-surface px-2 text-[13px] text-ink-subtle hover:bg-surface-hover"
          >
            <option value="">Status: All</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as TicketPriority | '');
              setPage(1);
            }}
            className="h-8 rounded-sm border border-line bg-surface px-2 text-[13px] text-ink-subtle hover:bg-surface-hover"
          >
            <option value="">Priority: All</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as TicketCategory | '');
              setPage(1);
            }}
            className="h-8 rounded-sm border border-line bg-surface px-2 text-[13px] text-ink-subtle hover:bg-surface-hover"
          >
            <option value="">Category: All</option>
            <option value="TECHNICAL">Technical</option>
            <option value="BILLING">Billing</option>
            <option value="ACCOUNT">Account</option>
            <option value="FEATURE_REQUEST">Feature Request</option>
            <option value="GENERAL">General</option>
          </select>

          {hasFilters && (
            <Button
              variant="link"
              onClick={() => {
                setSearch('');
                setStatus('');
                setPriority('');
                setCategory('');
                setPage(1);
                router.replace('/dashboard/tickets');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setCreateOpen(true)}
        >
          Create
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-sm border border-line-danger bg-surface px-4 py-3 text-[13px] text-ink-danger">
          <span>{error}</span>
          <Button
            variant="danger"
            size="compact"
            leftIcon={<RefreshCw className="h-3 w-3" />}
            onClick={fetchTickets}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Section 8: Jira List Table (40px sticky header, 40px rows) */}
      <div className="overflow-hidden rounded-sm border border-line bg-surface">
        {loading ? (
          <div className="divide-y divide-line p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 py-2.5">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[16px] font-medium text-ink">No issues match your filters</p>
            <p className="mt-1 text-[13px] text-ink-subtle">
              Adjust your search criteria or create a new support ticket.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10 border-b border-line bg-surface-sunken text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
                <tr className="h-10">
                  <th className="w-10 px-3">Type</th>
                  <th className="w-24 px-3">Key</th>
                  <th className="px-3">Summary</th>
                  <th className="w-32 px-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('status')}
                      className="inline-flex items-center gap-1 hover:text-ink"
                    >
                      Status
                      {sortBy === 'status' && (
                        <motion.span
                          animate={{ rotate: sortOrder === 'asc' ? 180 : 0 }}
                          transition={{ duration: duration.fast }}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </motion.span>
                      )}
                    </button>
                  </th>
                  <th className="w-28 px-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('priority')}
                      className="inline-flex items-center gap-1 hover:text-ink"
                    >
                      Priority
                      {sortBy === 'priority' && (
                        <motion.span
                          animate={{ rotate: sortOrder === 'asc' ? 180 : 0 }}
                          transition={{ duration: duration.fast }}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </motion.span>
                      )}
                    </button>
                  </th>
                  {user?.role === 'ADMIN' && <th className="w-40 px-3">Reporter</th>}
                  <th className="w-40 px-3">Assignee</th>
                  <th className="w-28 px-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('updatedAt')}
                      className="inline-flex items-center gap-1 hover:text-ink"
                    >
                      Updated
                      {sortBy === 'updatedAt' && (
                        <motion.span
                          animate={{ rotate: sortOrder === 'asc' ? 180 : 0 }}
                          transition={{ duration: duration.fast }}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </motion.span>
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[14px]">
                {tickets.map((ticket) => (
                  <motion.tr
                    key={ticket.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, ease: ease.out }}
                    onClick={() =>
                      router.push(`/dashboard/tickets?selectedIssue=${ticket.id}`, {
                        scroll: false,
                      })
                    }
                    className="h-10 cursor-pointer transition-colors duration-[80ms] hover:bg-surface-hover"
                  >
                    <td className="px-3">
                      <CategoryIcon category={ticket.category} />
                    </td>
                    <td className="whitespace-nowrap px-3 font-mono text-[12px] text-ink-subtlest">
                      {formatTicketCode(ticket.ticketNumber)}
                    </td>
                    <td className="max-w-md px-3">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-ink">
                          {ticket.title}
                        </span>
                        {(ticket._count?.comments ?? 0) > 0 && (
                          <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] text-ink-subtlest">
                            <MessageSquare className="h-3 w-3" />
                            {ticket._count?.comments}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3">
                      <StatusLozenge status={ticket.status} />
                    </td>
                    <td className="whitespace-nowrap px-3">
                      <PriorityIndicator priority={ticket.priority} showLabel />
                    </td>
                    {user?.role === 'ADMIN' && (
                      <td className="whitespace-nowrap px-3">
                        <div className="flex items-center gap-2 text-[13px] text-ink">
                          <Avatar name={ticket.createdBy.name} size={24} />
                          <span className="truncate">{ticket.createdBy.name}</span>
                        </div>
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3">
                      <div className="flex items-center gap-2 text-[13px] text-ink-subtle">
                        <Avatar name={ticket.assignedTo?.name} size={24} />
                        <span className="truncate">
                          {ticket.assignedTo?.name ?? 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 text-[12px] text-ink-subtlest">
                      {formatRelativeTime(ticket.updatedAt)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-line bg-surface-sunken px-4 py-2.5 text-[12px] text-ink-subtle">
          <span>
            Page <strong className="text-ink">{meta.page}</strong> of{' '}
            <strong className="text-ink">{meta.totalPages}</strong> ({meta.total} issues)
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="subtle"
              size="compact"
              disabled={meta.page <= 1}
              leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="subtle"
              size="compact"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <CreateTicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchTickets}
      />

      <TicketModal
        ticketId={selectedTicketId}
        onClose={() => router.push('/dashboard/tickets', { scroll: false })}
        onMutated={fetchTickets}
      />
    </div>
  );
}

export default function TicketsListPage() {
  return (
    <Suspense
      fallback={<div className="p-6 text-[13px] text-ink-subtle">Loading issues...</div>}
    >
      <ListContent />
    </Suspense>
  );
}
