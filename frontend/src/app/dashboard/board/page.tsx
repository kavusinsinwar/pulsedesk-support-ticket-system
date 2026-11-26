'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import {
  GripVertical,
  Lock,
  MessageSquare,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useToast } from '@/context/ToastContext';
import { api, ApiClientError } from '@/lib/api';
import { formatTicketCode } from '@/lib/format';
import {
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/lib/types';
import { duration, ease, spring } from '@/motion/tokens';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import {
  CategoryIcon,
  Lozenge,
  PriorityIndicator,
  STATUS_LABELS,
} from '@/components/ui/Lozenge';
import { BoardSkeleton } from '@/components/ui/Skeleton';
import { TicketModal } from '@/components/tickets/TicketModal';

const COLUMNS: { id: TicketStatus; label: string; wipLimit?: number }[] = [
  { id: 'OPEN', label: 'OPEN' },
  { id: 'IN_PROGRESS', label: 'IN PROGRESS', wipLimit: 5 },
  { id: 'RESOLVED', label: 'RESOLVED' },
  { id: 'CLOSED', label: 'CLOSED' },
];

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['IN_PROGRESS', 'OPEN', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['RESOLVED', 'IN_PROGRESS', 'CLOSED'],
  CLOSED: ['CLOSED', 'OPEN'],
};

function TicketCardContent({
  ticket,
  isDragging = false,
  isSelected = false,
}: {
  ticket: Ticket;
  isDragging?: boolean;
  isSelected?: boolean;
}) {
  const isUrgent = ticket.priority === 'URGENT';

  return (
    <div
      className={`group relative rounded-sm bg-surface p-3 shadow-raised transition-colors duration-[120ms] hover:bg-surface-hover ${
        isSelected ? 'ring-2 ring-brand' : ''
      } ${isUrgent ? 'border-l-[3px] border-l-[#E2483D]' : ''} ${
        isDragging ? 'shadow-drag' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 flex-1 text-[14px] leading-[20px] text-ink">
          {ticket.title}
        </p>
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-disabled opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Lozenge appearance="neutral">{ticket.category.replace('_', ' ')}</Lozenge>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <CategoryIcon category={ticket.category} />
          <span className="font-mono text-[12px] text-ink-subtlest">
            {formatTicketCode(ticket.ticketNumber)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <PriorityIndicator priority={ticket.priority} />
          {(ticket._count?.comments ?? 0) > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-ink-subtlest">
              <MessageSquare className="h-3 w-3" />
              {ticket._count?.comments}
            </span>
          )}
          <Avatar
            name={ticket.assignedTo?.name ?? ticket.createdBy.name}
            size={24}
          />
        </div>
      </div>
    </div>
  );
}

function SortableTicketCard({
  ticket,
  isSelected,
  onSelect,
}: {
  ticket: Ticket;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ticket.id,
    data: { ticket, status: ticket.status },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className="cursor-grab select-none active:cursor-grabbing"
    >
      {isDragging ? (
        <div className="h-[104px] rounded-sm border-2 border-dashed border-line-strong bg-surface-hover opacity-60" />
      ) : (
        <TicketCardContent ticket={ticket} isSelected={isSelected} />
      )}
    </div>
  );
}

function KanbanColumn({
  column,
  tickets,
  selectedId,
  isOver,
  onSelectTicket,
  onCreated,
}: {
  column: (typeof COLUMNS)[number];
  tickets: Ticket[];
  selectedId: string | null;
  isOver: boolean;
  onSelectTicket: (id: string) => void;
  onCreated: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const { pushToast } = useToast();

  const [inlineOpen, setInlineOpen] = useState(false);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlinePriority, setInlinePriority] = useState<TicketPriority>('MEDIUM');
  const [inlineCategory, setInlineCategory] = useState<TicketCategory>('TECHNICAL');
  const [creating, setCreating] = useState(false);

  const wipExceeded = Boolean(column.wipLimit && tickets.length > column.wipLimit);

  const handleInlineCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inlineTitle.trim().length < 5) {
      pushToast({
        variant: 'error',
        title: 'Summary too short',
        description: 'Please enter at least 5 characters.',
      });
      return;
    }

    setCreating(true);
    try {
      const res = await api.tickets.create({
        title: inlineTitle.trim(),
        description: `${inlineTitle.trim()} — raised from PulseDesk Kanban board.`,
        category: inlineCategory,
        priority: inlinePriority,
      });
      pushToast({
        variant: 'success',
        title: `${formatTicketCode(res.data.ticket.ticketNumber)} created`,
      });
      setInlineTitle('');
      setInlineOpen(false);
      onCreated();
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Could not create ticket',
        description: err instanceof ApiClientError ? err.message : undefined,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        backgroundColor: isOver
          ? 'var(--color-brand-subtle)'
          : wipExceeded
            ? 'var(--bg-wip-exceeded)'
            : 'var(--bg-column)',
      }}
      className={`flex h-[calc(100vh-255px)] min-h-[420px] w-[272px] shrink-0 flex-col rounded-sm p-2 transition-colors duration-[150ms] ${
        isOver ? 'ring-2 ring-inset ring-brand' : ''
      }`}
    >
      {/* Column Header */}
      <div className="mb-2 flex items-center justify-between px-1 py-1">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtle">
            {column.label}
          </h2>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
              wipExceeded
                ? 'text-ink-danger'
                : 'bg-surface-pressed text-ink-subtle'
            }`}
            style={
              wipExceeded ? { backgroundColor: 'var(--lozenge-red-bg)' } : undefined
            }
          >
            {column.wipLimit ? `${tickets.length} / ${column.wipLimit}` : tickets.length}
          </span>
        </div>
      </div>

      {/* Cards Scroll Area with SortableContext */}
      <SortableContext
        items={tickets.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
          {tickets.map((ticket) => (
            <SortableTicketCard
              key={ticket.id}
              ticket={ticket}
              isSelected={selectedId === ticket.id}
              onSelect={() => onSelectTicket(ticket.id)}
            />
          ))}

          {tickets.length === 0 && !inlineOpen && (
            <div className="flex h-24 items-center justify-center rounded-sm border border-dashed border-line text-[12px] text-ink-subtlest">
              {isOver ? 'Drop ticket here' : 'No tickets'}
            </div>
          )}
        </div>
      </SortableContext>

      {/* Inline Create Issue in OPEN column */}
      {column.id === 'OPEN' && (
        <div className="mt-2">
          {!inlineOpen ? (
            <button
              type="button"
              onClick={() => setInlineOpen(true)}
              className="flex h-8 w-full items-center gap-1.5 rounded-sm px-2 text-[13px] font-medium text-ink-subtle transition-colors duration-[80ms] hover:bg-surface-hover hover:text-ink"
            >
              <Plus className="h-4 w-4" />
              Create ticket
            </button>
          ) : (
            <motion.form
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: duration.base, ease: ease.out }}
              onSubmit={handleInlineCreate}
              className="rounded-sm border-2 border-line-focus bg-surface p-2.5 shadow-raised"
            >
              <textarea
                autoFocus
                rows={2}
                value={inlineTitle}
                onChange={(e) => setInlineTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setInlineOpen(false);
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleInlineCreate(e);
                  }
                }}
                placeholder="What needs to be done?"
                className="w-full resize-none bg-transparent text-[13px] text-ink placeholder:text-ink-disabled focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-between gap-1.5">
                <div className="flex gap-1">
                  <select
                    value={inlineCategory}
                    onChange={(e) => setInlineCategory(e.target.value as TicketCategory)}
                    className="h-6 rounded-sm border border-line bg-surface px-1 text-[11px] text-ink"
                  >
                    <option value="TECHNICAL">Tech</option>
                    <option value="BILLING">Billing</option>
                    <option value="ACCOUNT">Account</option>
                    <option value="FEATURE_REQUEST">Feature</option>
                    <option value="GENERAL">General</option>
                  </select>
                  <select
                    value={inlinePriority}
                    onChange={(e) => setInlinePriority(e.target.value as TicketPriority)}
                    className="h-6 rounded-sm border border-line bg-surface px-1 text-[11px] text-ink"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="subtle"
                    size="compact"
                    onClick={() => setInlineOpen(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="compact"
                    loading={creating}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </motion.form>
          )}
        </div>
      )}
    </div>
  );
}

function BoardContent() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { pushToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | ''>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [onlyMine, setOnlyMine] = useState(false);

  const [activeDragTicket, setActiveDragTicket] = useState<Ticket | null>(null);
  const [overColumn, setOverColumn] = useState<TicketStatus | null>(null);
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');

  const selectedTicketId = searchParams.get('selectedIssue');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchBoardTickets = useCallback(async () => {
    try {
      const res = await api.tickets.list({
        limit: 50,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
      setTickets(res.data);
    } catch (err) {
      pushToast({
        variant: 'error',
        title: 'Failed to load board',
        description: err instanceof ApiClientError ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    fetchBoardTickets();
  }, [fetchBoardTickets]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchBoardTickets();
    socket.on('ticket:event', refresh);
    socket.on('ticket:deleted', refresh);
    return () => {
      socket.off('ticket:event', refresh);
      socket.off('ticket:deleted', refresh);
    };
  }, [socket, fetchBoardTickets]);

  const participants = useMemo(() => {
    const map = new Map<string, string>();
    tickets.forEach((t) => {
      if (t.assignedTo) map.set(t.assignedTo.id, t.assignedTo.name);
      map.set(t.createdBy.id, t.createdBy.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const code = formatTicketCode(t.ticketNumber).toLowerCase();
        if (
          !t.title.toLowerCase().includes(q) &&
          !t.description.toLowerCase().includes(q) &&
          !code.includes(q)
        ) {
          return false;
        }
      }
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (
        assigneeFilter &&
        t.assignedToId !== assigneeFilter &&
        t.createdById !== assigneeFilter
      ) {
        return false;
      }
      if (onlyMine && user && t.createdById !== user.id && t.assignedToId !== user.id) {
        return false;
      }
      return true;
    });
  }, [tickets, search, priorityFilter, categoryFilter, assigneeFilter, onlyMine, user]);

  const isAdmin = user?.role === 'ADMIN';

  // Multi-container Kanban collision detection: prioritize pointerWithin over cards/columns,
  // falling back to rectIntersection & closestCenter so empty columns and cards both catch drops reliably.
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      const pointerCollisions = pointerWithin(args);
      const intersections =
        pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
      const overId = getFirstCollision(intersections, 'id');

      if (overId != null) {
        const overStr = String(overId);
        if (COLUMNS.some((c) => c.id === overStr)) {
          const columnTicketIds = new Set(
            filteredTickets.filter((t) => t.status === overStr).map((t) => t.id)
          );
          if (columnTicketIds.size > 0) {
            const cardHits = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter((c) =>
                columnTicketIds.has(String(c.id))
              ),
            });
            if (cardHits.length > 0) return cardHits;
          }
        }
        return [{ id: overId }];
      }

      return closestCenter(args);
    },
    [filteredTickets]
  );

  const resolveDropStatus = (overId: string): TicketStatus | null => {
    if (COLUMNS.some((c) => c.id === overId)) {
      return overId as TicketStatus;
    }
    const overTicket = tickets.find((t) => t.id === overId);
    return overTicket ? overTicket.status : null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const t = tickets.find((item) => item.id === event.active.id);
    if (t) setActiveDragTicket(t);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!event.over) {
      setOverColumn(null);
      return;
    }
    setOverColumn(resolveDropStatus(String(event.over.id)));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const draggedId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    setActiveDragTicket(null);
    setOverColumn(null);

    if (!overId) return;
    const draggedTicket = tickets.find((t) => t.id === draggedId);
    if (!draggedTicket) return;

    const targetStatus = resolveDropStatus(overId);
    if (!targetStatus) return;

    // Reorder within the same column (allowed for both Admin and User)
    if (draggedTicket.status === targetStatus) {
      if (overId !== targetStatus && draggedId !== overId) {
        setTickets((prev) => {
          const oldIndex = prev.findIndex((t) => t.id === draggedId);
          const newIndex = prev.findIndex((t) => t.id === overId);
          if (oldIndex === -1 || newIndex === -1) return prev;
          return arrayMove(prev, oldIndex, newIndex);
        });
      }
      return;
    }

    // Cross-column status change: strictly restricted to ADMIN by RBAC
    if (!isAdmin) {
      pushToast({
        variant: 'info',
        title: 'Status change restricted',
        description:
          'Per RBAC policy, only Admins can move tickets between statuses. Sign in as Demo Admin to triage.',
      });
      return;
    }

    if (!VALID_TRANSITIONS[draggedTicket.status].includes(targetStatus)) {
      pushToast({
        variant: 'error',
        title: 'Transition not allowed',
        description: `Cannot move directly from ${STATUS_LABELS[draggedTicket.status]} to ${STATUS_LABELS[targetStatus]}.`,
      });
      return;
    }

    const previousStatus = draggedTicket.status;
    setTickets((prev) =>
      prev.map((t) => (t.id === draggedId ? { ...t, status: targetStatus } : t))
    );
    setAriaAnnouncement(
      `${formatTicketCode(draggedTicket.ticketNumber)} moved to ${STATUS_LABELS[targetStatus]}`
    );

    try {
      await api.tickets.adminUpdate(draggedId, { status: targetStatus });
      pushToast({
        variant: 'success',
        title: `${formatTicketCode(draggedTicket.ticketNumber)} moved to ${STATUS_LABELS[targetStatus]}`,
        action: {
          label: 'Undo',
          onClick: async () => {
            setTickets((prev) =>
              prev.map((t) => (t.id === draggedId ? { ...t, status: previousStatus } : t))
            );
            await api.tickets.adminUpdate(draggedId, { status: previousStatus });
            fetchBoardTickets();
          },
        },
      });
    } catch (err) {
      setTickets((prev) =>
        prev.map((t) => (t.id === draggedId ? { ...t, status: previousStatus } : t))
      );
      pushToast({
        variant: 'error',
        title: 'Status update failed',
        description: err instanceof ApiClientError ? err.message : undefined,
      });
    }
  };

  const openTicketModal = (id: string) => {
    router.push(`/dashboard/board?selectedIssue=${id}`, { scroll: false });
  };

  const closeTicketModal = () => {
    router.push('/dashboard/board', { scroll: false });
  };

  const hasFilters = Boolean(
    search || priorityFilter || categoryFilter || assigneeFilter || onlyMine
  );

  return (
    <div className="space-y-4">
      <div aria-live="polite" className="sr-only">
        {ariaAnnouncement}
      </div>

      {/* Board Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-ink-subtlest" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search this board"
              className="h-8 w-44 rounded-sm border-2 border-line bg-surface pl-8 pr-2 text-[13px] text-ink transition-colors duration-[80ms] hover:bg-surface-hover focus:border-line-focus focus:bg-surface"
            />
          </div>

          <div className="flex items-center pl-2">
            {participants.slice(0, 5).map((person) => {
              const selected = assigneeFilter === person.id;
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() =>
                    setAssigneeFilter((prev) => (prev === person.id ? '' : person.id))
                  }
                  className={`-ml-2 rounded-full transition-all ${
                    selected ? 'z-10 ring-2 ring-brand' : ''
                  }`}
                >
                  <Avatar name={person.name} size={24} />
                </button>
              );
            })}
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | '')}
            className="h-8 rounded-sm border border-line bg-surface px-2 text-[13px] text-ink-subtle hover:bg-surface-hover"
          >
            <option value="">Priority</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as TicketCategory | '')}
            className="h-8 rounded-sm border border-line bg-surface px-2 text-[13px] text-ink-subtle hover:bg-surface-hover"
          >
            <option value="">Category</option>
            <option value="TECHNICAL">Technical</option>
            <option value="BILLING">Billing</option>
            <option value="ACCOUNT">Account</option>
            <option value="FEATURE_REQUEST">Feature Request</option>
            <option value="GENERAL">General</option>
          </select>

          <Button
            variant={onlyMine ? 'primary' : 'subtle'}
            size="default"
            onClick={() => setOnlyMine((prev) => !prev)}
          >
            Only my tickets
          </Button>

          {hasFilters && (
            <Button
              variant="link"
              size="default"
              onClick={() => {
                setSearch('');
                setPriorityFilter('');
                setCategoryFilter('');
                setAssigneeFilter('');
                setOnlyMine(false);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {!isAdmin && (
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-surface-sunken px-2.5 py-1 text-[12px] text-ink-subtle">
            <Lock className="h-3 w-3 text-ink-subtlest" />
            Reorder cards freely · Admin role required to move status columns
          </span>
        )}
      </div>

      {/* Kanban Columns */}
      {loading ? (
        <BoardSkeleton />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setActiveDragTicket(null);
            setOverColumn(null);
          }}
        >
          <div className="flex gap-2 overflow-x-auto pb-4">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tickets={filteredTickets.filter((t) => t.status === column.id)}
                selectedId={selectedTicketId}
                isOver={overColumn === column.id}
                onSelectTicket={openTicketModal}
                onCreated={fetchBoardTickets}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.15, 1, 0.3, 1)' }}>
            {activeDragTicket ? (
              <motion.div
                initial={{ scale: 1, rotate: 0 }}
                animate={{ scale: 1.03, rotate: 2, opacity: 0.96 }}
                transition={spring.drop}
                className="pointer-events-none w-[256px]"
              >
                <TicketCardContent ticket={activeDragTicket} isDragging />
              </motion.div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <TicketModal
        ticketId={selectedTicketId}
        onClose={closeTicketModal}
        onMutated={fetchBoardTickets}
      />
    </div>
  );
}

export default function BoardPage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <BoardContent />
    </Suspense>
  );
}
