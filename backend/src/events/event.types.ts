import { EventType, Role, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

export interface BaseEventPayload {
  ticketId: string;
  ticketNumber: number;
  ticketTitle: string;
  ticketCreatedById: string;
  assignedToId?: string | null;
  actorId: string;
  actorName: string;
  actorRole: Role;
  occurredAt: Date;
}

export interface TicketCreatedPayload extends BaseEventPayload {
  priority: TicketPriority;
  category: TicketCategory;
}

export interface TicketUpdatedPayload extends BaseEventPayload {
  changedFields: string[];
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export interface TicketStatusChangedPayload extends BaseEventPayload {
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
}

export interface CommentAddedPayload extends BaseEventPayload {
  commentId: string;
  commentPreview: string;
}

export interface TicketResolvedPayload extends BaseEventPayload {
  fromStatus: TicketStatus;
  resolvedAt: Date;
}

export interface DomainEventMap {
  [EventType.TICKET_CREATED]: TicketCreatedPayload;
  [EventType.TICKET_UPDATED]: TicketUpdatedPayload;
  [EventType.TICKET_STATUS_CHANGED]: TicketStatusChangedPayload;
  [EventType.COMMENT_ADDED]: CommentAddedPayload;
  [EventType.TICKET_RESOLVED]: TicketResolvedPayload;
}
