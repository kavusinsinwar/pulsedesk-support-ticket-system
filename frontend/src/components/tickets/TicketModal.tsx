'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ExternalLink,
  Trash2,
  X,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { RealtimeTicketEvent, useSocket } from '@/context/SocketContext';
import { useToast } from '@/context/ToastContext';
import { api, ApiClientError } from '@/lib/api';
import { formatRelativeTime, formatTicketCode } from '@/lib/format';
import {
  TicketCategory,
  TicketDetail,
  TicketPriority,
  TicketStatus,
  User,
} from '@/lib/types';
import { duration, ease, spring } from '@/motion/tokens';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
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
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['IN_PROGRESS', 'OPEN', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['RESOLVED', 'IN_PROGRESS', 'CLOSED'],
  CLOSED: ['CLOSED', 'OPEN'],
};

const QUICK_REPLIES = ['Investigating now', 'Need more details', 'Fix deployed'];

export function TicketModal({
  ticketId,
  onClose,
  onMutated,
}: {
  ticketId: string | null;
  onClose: () => void;
  onMutated: () => void;
}) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { pushToast } = useToast();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const [activityTab, setActivityTab] = useState<'all' | 'comments' | 'history'>('all');
  const [commentExpanded, setCommentExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      const res = await api.tickets.getById(ticketId);
      setTicket(res.data.ticket);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Unable to load ticket',
        description: err instanceof ApiClientError ? err.message : undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }, [ticketId, pushToast, onClose]);

  useEffect(() => {
    if (!ticketId) {
      setTicket(null);
      return;
    }
    setLoading(true);
    setCommentExpanded(false);
    setCommentText('');
    loadTicket();
  }, [ticketId, loadTicket]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.auth
        .listAdmins()
        .then((res) => setAdmins(res.data.admins))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!ticketId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleteOpen) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ticketId, deleteOpen, onClose]);

  // Real-time socket room join while modal is open
  useEffect(() => {
    if (!socket || !ticketId) return;
    socket.emit('ticket:join', ticketId);

    const onEvent = (event: RealtimeTicketEvent) => {
      if (event.ticketId === ticketId) {
        loadTicket();
      }
    };

    const onDeleted = (payload: { ticketId: string }) => {
      if (payload.ticketId === ticketId) {
        onClose();
      }
    };

    socket.on('ticket:event', onEvent);
    socket.on('ticket:deleted', onDeleted);
    return () => {
      socket.emit('ticket:leave', ticketId);
      socket.off('ticket:event', onEvent);
      socket.off('ticket:deleted', onDeleted);
    };
  }, [socket, ticketId, loadTicket, onClose]);

  const handleStatusChange = async (nextStatus: TicketStatus) => {
    if (!ticket || nextStatus === ticket.status) return;
    const previousStatus = ticket.status;
    setTicket({ ...ticket, status: nextStatus });

    try {
      await api.tickets.adminUpdate(ticket.id, { status: nextStatus });
      await loadTicket();
      onMutated();
      pushToast({
        variant: 'success',
        title: `${formatTicketCode(ticket.ticketNumber)} moved to ${STATUS_LABELS[nextStatus]}`,
        action: {
          label: 'Undo',
          onClick: async () => {
            await api.tickets.adminUpdate(ticket.id, { status: previousStatus });
            loadTicket();
            onMutated();
          },
        },
      });
    } catch (err) {
      setTicket({ ...ticket, status: previousStatus });
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
      onMutated();
      pushToast({ variant: 'success', title: 'Ticket updated' });
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Update failed',
        description: err instanceof ApiClientError ? err.message : undefined,
      });
    }
  };

  const handleOwnerInlineSave = async (
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
    onMutated();
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
      onMutated();
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Could not add comment',
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
      setDeleteOpen(false);
      onClose();
      onMutated();
    } catch (err) {
      setDeleting(false);
      setDeleteOpen(false);
      pushToast({
        variant: 'error',
        title: 'Could not delete ticket',
        description: err instanceof ApiClientError ? err.message : undefined,
      });
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isOwner = Boolean(ticket && user?.id === ticket.createdById);
  const canOwnerEdit = Boolean(ticket && isOwner && ticket.status === 'OPEN');
  const canDelete = Boolean(ticket && (isAdmin || canOwnerEdit));

  return (
    <AnimatePresence>
      {ticketId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[600] flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--bg-blanket)' }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleteOpen) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: duration.moderate, ease: ease.out }}
            className="flex max-h-[calc(100vh-80px)] w-full max-w-[968px] flex-col overflow-hidden rounded-lg bg-surface-overlay shadow-overlay"
          >
            {loading || !ticket ? (
              <div className="grid gap-6 p-6 md:grid-cols-3">
                <div className="space-y-4 md:col-span-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-28 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-44 w-full" />
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
                {/* Left Column */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Top Breadcrumb + Actions */}
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[13px] text-ink-subtle">
                      <CategoryIcon category={ticket.category} />
                      <span>PulseDesk</span>
                      <span className="text-ink-subtlest">/</span>
                      <span className="font-mono font-medium text-ink">
                        {formatTicketCode(ticket.ticketNumber)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/dashboard/tickets/${ticket.id}`}
                        title="Open full page"
                        className="rounded-sm p-1.5 text-ink-subtle transition-colors duration-[80ms] hover:bg-surface-hover hover:text-ink"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteOpen(true)}
                          title="Delete ticket"
                          className="rounded-sm p-1.5 text-ink-subtle transition-colors duration-[80ms] hover:bg-surface-hover hover:text-ink-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onClose}
                        title="Close (Esc)"
                        className="rounded-sm p-1.5 text-ink-subtle transition-colors duration-[80ms] hover:bg-surface-hover hover:text-ink"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Editable Summary */}
                  <InlineEdit
                    value={ticket.title}
                    disabled={!canOwnerEdit && !isAdmin}
                    onSave={(next) => handleOwnerInlineSave({ title: next })}
                    textClassName="text-[22px] font-medium leading-[28px] text-ink"
                  />

                  {/* Description */}
                  <div className="mt-5">
                    <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
                      Description
                    </h3>
                    <InlineEdit
                      value={ticket.description}
                      multiline
                      disabled={!canOwnerEdit && !isAdmin}
                      onSave={(next) => handleOwnerInlineSave({ description: next })}
                      textClassName="whitespace-pre-wrap text-[14px] leading-[20px] text-ink"
                    />
                  </div>

                  {/* Activity Section */}
                  <div className="mt-7">
                    <div className="flex items-center justify-between border-b border-line">
                      <div className="flex gap-1">
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
                                  layoutId="modal-activity-tab"
                                  transition={spring.layout}
                                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expanding Comment Box */}
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
                                        setCommentText((prev) =>
                                          prev ? `${prev} ${chip}` : chip
                                        )
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
                                    size="default"
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

                    {/* Feed Items */}
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
                                <span className="text-[13px] font-medium text-ink">
                                  {c.author.name}
                                </span>
                                {c.author.role === 'ADMIN' && (
                                  <Lozenge appearance="blue">ADMIN</Lozenge>
                                )}
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
                              <p className="mt-0.5 text-[13px] text-ink-subtle">
                                {log.description}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Right Details Sidebar (320px) */}
                <aside className="w-full shrink-0 overflow-y-auto border-t border-line bg-surface p-6 md:w-[320px] md:border-l md:border-t-0">
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
                            className="z-[700] min-w-[180px] rounded-md border border-line bg-surface-overlay py-1 shadow-overlay"
                          >
                            {VALID_TRANSITIONS[ticket.status].map((s) => (
                              <DropdownMenu.Item
                                key={s}
                                onSelect={() => handleStatusChange(s)}
                                className="flex h-8 cursor-pointer items-center justify-between px-3 text-[13px] text-ink outline-none hover:bg-surface-hover"
                              >
                                <Lozenge appearance={STATUS_APPEARANCE[s]}>
                                  {STATUS_LABELS[s]}
                                </Lozenge>
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
                              handleAdminField({
                                assignedToId: e.target.value || null,
                              })
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
                              handleAdminField({
                                priority: e.target.value as TicketPriority,
                              })
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
                              handleOwnerInlineSave({
                                priority: e.target.value as TicketPriority,
                              })
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
                        {canOwnerEdit || isAdmin ? (
                          <select
                            value={ticket.category}
                            onChange={(e) =>
                              handleOwnerInlineSave({
                                category: e.target.value as TicketCategory,
                              })
                            }
                            disabled={!canOwnerEdit}
                            className="h-7 flex-1 rounded-sm border border-transparent bg-transparent px-1 text-[13px] text-ink hover:bg-surface-hover focus:border-line-focus focus:bg-surface disabled:cursor-default disabled:hover:bg-transparent"
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
            )}
          </motion.div>

          <ConfirmModal
            open={deleteOpen}
            title={ticket ? `Delete ${formatTicketCode(ticket.ticketNumber)}?` : 'Delete ticket?'}
            description="This permanently removes the ticket, comments, and activity logs."
            confirmLabel="Delete"
            loading={deleting}
            onConfirm={handleDelete}
            onClose={() => setDeleteOpen(false)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
