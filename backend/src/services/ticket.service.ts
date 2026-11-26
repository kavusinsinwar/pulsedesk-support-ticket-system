import { EventType, Role, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { isValidStatusTransition } from '../constants/tickets';
import { eventBus } from '../events/eventBus';
import { AuthenticatedUser } from '../middlewares/auth.middleware';
import { emitRealtimeEvent } from '../realtime/socketServer';
import { ticketRepository } from '../repositories/ticket.repository';
import { userRepository } from '../repositories/user.repository';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';

export const ticketService = {
  async createTicket(
    actor: AuthenticatedUser,
    input: {
      title: string;
      description: string;
      category: TicketCategory;
      priority: TicketPriority;
    }
  ) {
    const ticket = await ticketRepository.create({
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      createdById: actor.id,
    });

    eventBus.emit(EventType.TICKET_CREATED, {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      ticketTitle: ticket.title,
      ticketCreatedById: ticket.createdById,
      assignedToId: ticket.assignedToId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      priority: ticket.priority,
      category: ticket.category,
      occurredAt: new Date(),
    });

    return ticket;
  },

  async listTickets(
    actor: AuthenticatedUser,
    query: {
      status?: TicketStatus;
      priority?: TicketPriority;
      category?: TicketCategory;
      search?: string;
      sortBy: 'createdAt' | 'updatedAt' | 'priority' | 'status';
      sortOrder: 'asc' | 'desc';
      page: number;
      limit: number;
    }
  ) {
    const { items, total } = await ticketRepository.findMany({
      ...query,
      createdById: actor.role === Role.ADMIN ? undefined : actor.id,
    });

    return {
      items,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  },

  async getTicketById(actor: AuthenticatedUser, ticketId: string) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket');
    }

    if (actor.role !== Role.ADMIN && ticket.createdById !== actor.id) {
      throw new ForbiddenError('You can only view your own support tickets');
    }

    return ticket;
  },

  async updateTicketByOwner(
    actor: AuthenticatedUser,
    ticketId: string,
    input: {
      title?: string;
      description?: string;
      category?: TicketCategory;
      priority?: TicketPriority;
    }
  ) {
    const existing = await ticketRepository.findByIdBasic(ticketId);
    if (!existing) {
      throw new NotFoundError('Ticket');
    }

    if (actor.role !== Role.ADMIN && existing.createdById !== actor.id) {
      throw new ForbiddenError('You can only edit your own support tickets');
    }

    // Users can edit ticket details only while the ticket has not been picked up or resolved
    if (actor.role !== Role.ADMIN && existing.status !== TicketStatus.OPEN) {
      throw new BadRequestError(
        `Tickets in ${existing.status} status cannot be modified by the requester`
      );
    }

    const changedFields: string[] = [];
    const previousValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    (['title', 'description', 'category', 'priority'] as const).forEach((field) => {
      if (input[field] !== undefined && input[field] !== existing[field]) {
        changedFields.push(field);
        previousValues[field] = existing[field];
        newValues[field] = input[field];
      }
    });

    const updated = await ticketRepository.update(ticketId, input);

    if (changedFields.length > 0) {
      eventBus.emit(EventType.TICKET_UPDATED, {
        ticketId: updated.id,
        ticketNumber: updated.ticketNumber,
        ticketTitle: updated.title,
        ticketCreatedById: updated.createdById,
        assignedToId: updated.assignedToId,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        changedFields,
        previousValues,
        newValues,
        occurredAt: new Date(),
      });
    }

    return updated;
  },

  async adminUpdateTicket(
    actor: AuthenticatedUser,
    ticketId: string,
    input: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string | null;
    }
  ) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenError('Only administrators can update ticket status or assignment');
    }

    const existing = await ticketRepository.findByIdBasic(ticketId);
    if (!existing) {
      throw new NotFoundError('Ticket');
    }

    if (input.status && !isValidStatusTransition(existing.status, input.status)) {
      throw new BadRequestError(
        `Invalid status transition from ${existing.status} to ${input.status}`
      );
    }

    if (input.assignedToId) {
      const assignee = await userRepository.findById(input.assignedToId);
      if (!assignee || assignee.role !== Role.ADMIN) {
        throw new BadRequestError('Assigned user must be a valid administrator');
      }
    }

    const isStatusChanging = input.status !== undefined && input.status !== existing.status;
    const isResolving = isStatusChanging && input.status === TicketStatus.RESOLVED;

    const updated = await ticketRepository.update(ticketId, {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.assignedToId !== undefined
        ? input.assignedToId === null
          ? { assignedTo: { disconnect: true } }
          : { assignedTo: { connect: { id: input.assignedToId } } }
        : {}),
      ...(isStatusChanging
        ? {
            resolvedAt:
              input.status === TicketStatus.RESOLVED
                ? new Date()
                : input.status === TicketStatus.OPEN || input.status === TicketStatus.IN_PROGRESS
                  ? null
                  : existing.resolvedAt,
          }
        : {}),
    });

    const now = new Date();
    const changedFields: string[] = [];
    const previousValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    if (input.priority !== undefined && input.priority !== existing.priority) {
      changedFields.push('priority');
      previousValues.priority = existing.priority;
      newValues.priority = input.priority;
    }

    if (input.assignedToId !== undefined && input.assignedToId !== existing.assignedToId) {
      changedFields.push('assignedTo');
      previousValues.assignedToId = existing.assignedToId;
      newValues.assignedToId = input.assignedToId;
    }

    if (changedFields.length > 0) {
      eventBus.emit(EventType.TICKET_UPDATED, {
        ticketId: updated.id,
        ticketNumber: updated.ticketNumber,
        ticketTitle: updated.title,
        ticketCreatedById: updated.createdById,
        assignedToId: updated.assignedToId,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        changedFields,
        previousValues,
        newValues,
        occurredAt: now,
      });
    }

    if (isStatusChanging && input.status) {
      eventBus.emit(EventType.TICKET_STATUS_CHANGED, {
        ticketId: updated.id,
        ticketNumber: updated.ticketNumber,
        ticketTitle: updated.title,
        ticketCreatedById: updated.createdById,
        assignedToId: updated.assignedToId,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        fromStatus: existing.status,
        toStatus: input.status,
        occurredAt: now,
      });
    }

    if (isResolving) {
      eventBus.emit(EventType.TICKET_RESOLVED, {
        ticketId: updated.id,
        ticketNumber: updated.ticketNumber,
        ticketTitle: updated.title,
        ticketCreatedById: updated.createdById,
        assignedToId: updated.assignedToId,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        fromStatus: existing.status,
        resolvedAt: now,
        occurredAt: now,
      });
    }

    return updated;
  },

  async deleteTicket(actor: AuthenticatedUser, ticketId: string) {
    const existing = await ticketRepository.findByIdBasic(ticketId);
    if (!existing) {
      throw new NotFoundError('Ticket');
    }

    if (actor.role !== Role.ADMIN) {
      if (existing.createdById !== actor.id) {
        throw new ForbiddenError('You can only delete your own support tickets');
      }
      if (existing.status !== TicketStatus.OPEN) {
        throw new BadRequestError(
          `Tickets in ${existing.status} status cannot be deleted by the requester`
        );
      }
    }

    await ticketRepository.delete(ticketId);
    emitRealtimeEvent({
      ticketId: existing.id,
      ticketCreatedById: existing.createdById,
      eventName: 'ticket:deleted',
      payload: {
        ticketId: existing.id,
        ticketNumber: existing.ticketNumber,
        actorId: actor.id,
        actorName: actor.name,
      },
    });
    return { id: ticketId };
  },
};
