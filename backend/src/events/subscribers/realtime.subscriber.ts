import { EventType } from '@prisma/client';
import { emitRealtimeEvent } from '../../realtime/socketServer';
import { eventBus } from '../eventBus';

export function registerRealtimeSubscribers(): void {
  eventBus.on(EventType.TICKET_CREATED, (payload) => {
    emitRealtimeEvent({
      ticketId: payload.ticketId,
      ticketCreatedById: payload.ticketCreatedById,
      eventName: 'ticket:event',
      payload: {
        type: EventType.TICKET_CREATED,
        ticketId: payload.ticketId,
        ticketNumber: payload.ticketNumber,
        ticketTitle: payload.ticketTitle,
        actorId: payload.actorId,
        actorName: payload.actorName,
        occurredAt: payload.occurredAt.toISOString(),
      },
    });
  });

  eventBus.on(EventType.TICKET_UPDATED, (payload) => {
    emitRealtimeEvent({
      ticketId: payload.ticketId,
      ticketCreatedById: payload.ticketCreatedById,
      eventName: 'ticket:event',
      payload: {
        type: EventType.TICKET_UPDATED,
        ticketId: payload.ticketId,
        ticketNumber: payload.ticketNumber,
        ticketTitle: payload.ticketTitle,
        changedFields: payload.changedFields,
        actorId: payload.actorId,
        actorName: payload.actorName,
        occurredAt: payload.occurredAt.toISOString(),
      },
    });
  });

  eventBus.on(EventType.TICKET_STATUS_CHANGED, (payload) => {
    emitRealtimeEvent({
      ticketId: payload.ticketId,
      ticketCreatedById: payload.ticketCreatedById,
      eventName: 'ticket:event',
      payload: {
        type: EventType.TICKET_STATUS_CHANGED,
        ticketId: payload.ticketId,
        ticketNumber: payload.ticketNumber,
        ticketTitle: payload.ticketTitle,
        fromStatus: payload.fromStatus,
        toStatus: payload.toStatus,
        actorId: payload.actorId,
        actorName: payload.actorName,
        occurredAt: payload.occurredAt.toISOString(),
      },
    });
  });

  eventBus.on(EventType.COMMENT_ADDED, (payload) => {
    emitRealtimeEvent({
      ticketId: payload.ticketId,
      ticketCreatedById: payload.ticketCreatedById,
      eventName: 'ticket:event',
      payload: {
        type: EventType.COMMENT_ADDED,
        ticketId: payload.ticketId,
        ticketNumber: payload.ticketNumber,
        ticketTitle: payload.ticketTitle,
        commentId: payload.commentId,
        commentPreview: payload.commentPreview,
        actorId: payload.actorId,
        actorName: payload.actorName,
        occurredAt: payload.occurredAt.toISOString(),
      },
    });
  });

  eventBus.on(EventType.TICKET_RESOLVED, (payload) => {
    emitRealtimeEvent({
      ticketId: payload.ticketId,
      ticketCreatedById: payload.ticketCreatedById,
      eventName: 'ticket:event',
      payload: {
        type: EventType.TICKET_RESOLVED,
        ticketId: payload.ticketId,
        ticketNumber: payload.ticketNumber,
        ticketTitle: payload.ticketTitle,
        actorId: payload.actorId,
        actorName: payload.actorName,
        occurredAt: payload.occurredAt.toISOString(),
      },
    });
  });
}
