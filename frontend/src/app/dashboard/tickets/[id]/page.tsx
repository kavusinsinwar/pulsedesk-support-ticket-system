'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, Trash2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { RealtimeTicketEvent, useSocket } from '@/context/SocketContext';
import { useToast } from '@/context/ToastContext';
import { api, ApiClientError } from '@/lib/api';
import { formatRelativeTime, formatTicketCode } from '@/lib/format';
import { TicketCategory, TicketDetail, TicketPriority, TicketStatus, User } from '@/lib/types';
import { duration, ease, spring } from '@/motion/tokens';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { InlineEdit } from '@/components/ui/InlineEdit';
import {
  CategoryIcon,
  Lozenge,
  PriorityIndicator,
  STATUS_APPEARANCE,
  STATUS_LABELS,
  StatusLozenge,
} from '@/components/ui/Lozenge';
import { Skeleton } from '@/components/ui/Skeleton';

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['IN_PROGRESS', 'OPEN', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['RESOLVED', 'IN_PROGRESS', 'CLOSED'],
  CLOSED: ['CLOSED', 'OPEN'],
};

const QUICK_REPLIES = ['Investigating now', 'Need more details', 'Fix deployed'];

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { pushToast } = useToast();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activityTab, setActivityTab] = useState<'all' | 'comments' | 'history'>('all');
  const [commentExpanded, setCommentExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTicket = useCallback(async () => {
    try {
      const res = await api.tickets.getById(id);
      setTicket(res.data.ticket);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to load ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.auth
        .listAdmins()
        .then((res) => setAdmins(res.data.admins))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('ticket:join', id);

    const onEvent = (event: RealtimeTicketEvent) => {
      if (event.ticketId === id) loadTicket();
    };

    const onDeleted = (payload: { ticketId: string }) => {
      if (payload.ticketId === id) {
        router.replace('/dashboard/board');
      }
    };

    socket.on('ticket:event', onEvent);
    socket.on('ticket:deleted', onDeleted);
    return () => {
      socket.emit('ticket:leave', id);
      socket.off('ticket:event', onEvent);
      socket.off('ticket:deleted', onDeleted);
    };
  }, [socket, id, loadTicket, router]);

  const handleStatusChange = async (nextStatus: TicketStatus) => {
    if (!ticket || nextStatus === ticket.status) return;
    const prev = ticket.status;
    setTicket({ ...ticket, status: nextStatus });

    try {
      await api.tickets.adminUpdate(ticket.id, { status: nextStatus });
      await loadTicket();
      pushToast({
        variant: 'success',
        title: `${formatTicketCode(ticket.ticketNumber)} moved to ${STATUS_LABELS[nextStatus]}`,
        action: {
          label: 'Undo',
          onClick: async () => {
            await api.tickets.adminUpdate(ticket.id, { status: prev });
            loadTicket();
          },
        },
      });
    } catch (err) {
      setTicket({ ...ticket, status: prev });
      pushToast({
        variant: 'error',
        title: 'Status update failed',
        description: err instanceof ApiClientError ? err.message : undefined,
      });
    }
  };

  const handleAdminField = async (patch: {
    priority?: TicketPriority;
    assignedToId?: string | null;
  }) => {
    if (!ticket) return;
    try {
      await api.tickets.adminUpdate(ticket.id, patch);
      await loadTicket();
      pushToast({ variant: 'success', title: 'Ticket updated' });
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Update failed',
        description: err instanceof ApiClientError ? err.message : undefined,
      });
    }
  };

  const handleInlineSave = async (
    patch: Partial<{
      title: string;
      description: string;
      priority: TicketPriority;
      category: TicketCategory;
    }>
  ) => {
    if (!ticket) return;
    await api.tickets.update(ticket.id, patch);
    await loadTicket();
    pushToast({ variant: 'success', title: 'Ticket updated' });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !commentText.trim()) return;
    setPostingComment(true);
    try {
      await api.tickets.addComment(ticket.id, commentText.trim());
      setCommentText('');
      setCommentExpanded(false);
      await loadTicket();
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Could not post comment',
        description: err instanceof ApiClientError ? err.message : undefined,
      });
    } finally {
      setPostingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!ticket) return;
    setDeleting(true);
    try {
      await api.tickets.delete(ticket.id);
      pushToast({
        variant: 'info',
        title: `${formatTicketCode(ticket.ticketNumber)} deleted`,
      });
      router.push('/dashboard/board');
    } catch (err) {
      setDeleting(false);
      setDeleteOpen(false);
      pushToast({
        variant: 'error',
        title: 'Delete failed',
        description: err instanceof ApiClientError ? err.message : undefined,
      });
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="rounded-sm border border-line-danger bg-surface p-8 text-center">
        <p className="text-[14px] font-medium text-ink-danger">{error || 'Ticket not found'}</p>
        <Link
          href="/dashboard/board"
          className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-link hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to board
        </Link>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';
  const isOwner = user?.id === ticket.createdById;
  const canOwnerEdit = isOwner && ticket.status === 'OPEN';
  const canDelete = isAdmin || canOwnerEdit;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/dashboard/board"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-subtle hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Board
        </Link>
        {canDelete && (
          <Button
            variant="subtle"
            leftIcon={<Trash2 className="h-3.5 w-3.5 text-ink-danger" />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete issue
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-6 rounded-sm border border-line bg-surface lg:flex-row">
        {/* Left Column */}
        <div className="flex-1 p-6">
          <div className="mb-3 flex items-center gap-2 text-[13px] text-ink-subtle">
            <CategoryIcon category={ticket.category} />
            <span>PulseDesk</span>
            <span className="text-ink-subtlest">/</span>
            <span className="font-mono font-medium text-ink">
              {formatTicketCode(ticket.ticketNumber)}
            </span>
          </div>

          <InlineEdit
            value={ticket.title}
            disabled={!canOwnerEdit && !isAdmin}
            onSave={(next) => handleInlineSave({ title: next })}
            textClassName="text-[24px] font-medium leading-[28px] text-ink"
          />

          <div className="mt-5">
            <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
              Description
            </h3>
            <InlineEdit
              value={ticket.description}
              multiline
              disabled={!canOwnerEdit && !isAdmin}
              onSave={(next) => handleInlineSave({ description: next })}
              textClassName="whitespace-pre-wrap text-[14px] leading-[20px] text-ink"
            />
          </div>

          {/* Activity Tabs */}
          <div className="mt-8">
            <div className="flex gap-1 border-b border-line">
              {(['all', 'comments', 'history'] as const).map((tab) => {
                const active = activityTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActivityTab(tab)}
                    className={`relative px-3 py-2 text-[13px] font-medium capitalize transition-colors duration-[80ms] ${
                      active
                        ? 'text-brand'
                        : 'text-ink-subtle hover:bg-surface-hover hover:text-ink'
                    }`}
                  >
                    {tab}
                    {active && (
                      <motion.span
                        layoutId="page-activity-tab"
                        transition={spring.layout}
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleAddComment} className="mt-4">
              <div className="flex items-start gap-2.5">
                <Avatar name={user?.name} size={32} liftOnHover={false} />
                <div className="flex-1">
                  {!commentExpanded ? (
                    <button
                      type="button"
                      onClick={() => setCommentExpanded(true)}
                      className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-left text-[14px] text-ink-disabled transition-colors duration-[80ms] hover:bg-surface-hover"
                    >
                      Add a comment...
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: duration.base, ease: ease.out }}
                      className="space-y-2"
                    >
                      <textarea
                        autoFocus
                        rows={3}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a reply..."
                        className="w-full rounded-sm border-2 border-line-focus bg-surface p-2.5 text-[14px] text-ink"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {QUICK_REPLIES.map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() =>
                                setCommentText((prev) => (prev ? `${prev} ${chip}` : chip))
                              }
                              className="rounded-sm bg-surface-column px-2 py-1 text-[11px] font-medium text-ink-subtle hover:bg-surface-hover hover:text-ink"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            variant="subtle"
                            onClick={() => {
                              setCommentExpanded(false);
                              setCommentText('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            variant="primary"
                            loading={postingComment}
                            disabled={!commentText.trim()}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </form>

            <div className="mt-5 space-y-4">
              {activityTab !== 'history' &&
                ticket.comments.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: duration.moderate, ease: ease.out }}
                    className="flex items-start gap-2.5"
                  >
                    <Avatar name={c.author.name} size={24} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-ink">{c.author.name}</span>
                        {c.author.role === 'ADMIN' && <Lozenge appearance="blue">ADMIN</Lozenge>}
                        <span className="text-[12px] text-ink-subtlest">
                          {formatRelativeTime(c.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-[14px] text-ink">
                        {c.content}
                      </p>
                    </div>
                  </motion.div>
                ))}

              {activityTab !== 'comments' &&
                ticket.activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5">
                    <Avatar name={log.actor.name} size={24} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium text-ink">
                          {log.actor.name}
                        </span>
                        <Lozenge appearance="neutral">{log.eventType}</Lozenge>
                        <span className="text-[12px] text-ink-subtlest">
                          {formatRelativeTime(log.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[13px] text-ink-subtle">{log.description}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right Details Sidebar (320px) */}
        <aside className="w-full shrink-0 border-t border-line p-6 lg:w-[320px] lg:border-l lg:border-t-0">
          <div className="mb-5">
            {isAdmin ? (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <div>
                    <StatusLozenge status={ticket.status} interactive />
                  </div>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="start"
                    sideOffset={6}
                    className="z-[400] min-w-[180px] rounded-md border border-line bg-surface-overlay py-1 shadow-overlay"
                  >
                    {VALID_TRANSITIONS[ticket.status].map((s) => (
                      <DropdownMenu.Item
                        key={s}
                        onSelect={() => handleStatusChange(s)}
                        className="flex h-8 cursor-pointer items-center px-3 text-[13px] outline-none hover:bg-surface-hover"
                      >
                        <Lozenge appearance={STATUS_APPEARANCE[s]}>{STATUS_LABELS[s]}</Lozenge>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : (
              <StatusLozenge status={ticket.status} />
            )}
          </div>

          <div className="rounded-sm border border-line">
            <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
              <span className="text-[13px] font-semibold text-ink">Details</span>
              <ChevronDown className="h-4 w-4 text-ink-subtle" />
            </div>

            <div className="space-y-3.5 p-3 text-[13px]">
              <div className="flex items-center">
                <span className="w-[104px] shrink-0 text-ink-subtle">Assignee</span>
                {isAdmin ? (
                  <select
                    value={ticket.assignedToId ?? ''}
                    onChange={(e) =>
                      handleAdminField({ assignedToId: e.target.value || null })
                    }
                    className="h-7 flex-1 rounded-sm border border-transparent bg-transparent px-1 text-[13px] text-ink hover:bg-surface-hover focus:border-line-focus focus:bg-surface"
                  >
                    <option value="">Unassigned</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="flex items-center gap-2 text-ink">
                    <Avatar name={ticket.assignedTo?.name} size={24} />
                    <span>{ticket.assignedTo?.name ?? 'Unassigned'}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center">
                <span className="w-[104px] shrink-0 text-ink-subtle">Reporter</span>
                <span className="flex items-center gap-2 text-ink">
                  <Avatar name={ticket.createdBy.name} size={24} />
                  <span className="truncate">{ticket.createdBy.name}</span>
                </span>
              </div>

              <div className="flex items-center">
                <span className="w-[104px] shrink-0 text-ink-subtle">Priority</span>
                {isAdmin ? (
                  <select
                    value={ticket.priority}
                    onChange={(e) =>
                      handleAdminField({ priority: e.target.value as TicketPriority })
                    }
                    className="h-7 flex-1 rounded-sm border border-transparent bg-transparent px-1 text-[13px] text-ink hover:bg-surface-hover focus:border-line-focus focus:bg-surface"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                ) : canOwnerEdit ? (
                  <select
                    value={ticket.priority}
                    onChange={(e) =>
                      handleInlineSave({ priority: e.target.value as TicketPriority })
                    }
                    className="h-7 flex-1 rounded-sm border border-transparent bg-transparent px-1 text-[13px] text-ink hover:bg-surface-hover focus:border-line-focus focus:bg-surface"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                ) : (
                  <PriorityIndicator priority={ticket.priority} showLabel />
                )}
              </div>

              <div className="flex items-center">
                <span className="w-[104px] shrink-0 text-ink-subtle">Category</span>
                {canOwnerEdit ? (
                  <select
                    value={ticket.category}
                    onChange={(e) =>
                      handleInlineSave({ category: e.target.value as TicketCategory })
                    }
                    className="h-7 flex-1 rounded-sm border border-transparent bg-transparent px-1 text-[13px] text-ink hover:bg-surface-hover focus:border-line-focus focus:bg-surface"
                  >
                    <option value="TECHNICAL">Technical</option>
                    <option value="BILLING">Billing</option>
                    <option value="ACCOUNT">Account</option>
                    <option value="FEATURE_REQUEST">Feature Request</option>
                    <option value="GENERAL">General</option>
                  </select>
                ) : (
                  <span className="flex items-center gap-1.5 text-ink">
                    <CategoryIcon category={ticket.category} />
                    <span>{ticket.category.replace('_', ' ')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1 text-[12px] text-ink-subtlest">
            <p>Created {formatRelativeTime(ticket.createdAt)}</p>
            <p>Updated {formatRelativeTime(ticket.updatedAt)}</p>
          </div>
        </aside>
      </div>

      <ConfirmModal
        open={deleteOpen}
        title={`Delete ${formatTicketCode(ticket.ticketNumber)}?`}
        description="This permanently removes the ticket, its comments, and activity logs."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
