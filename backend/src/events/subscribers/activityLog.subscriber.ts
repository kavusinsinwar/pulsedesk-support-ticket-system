import { EventType, Prisma } from '@prisma/client';
import { eventBus } from '../eventBus';
import { activityLogRepository } from '../../repositories/activityLog.repository';

export function registerActivityLogSubscribers(): void {
  eventBus.on(EventType.TICKET_CREATED, async (payload) => {
    await activityLogRepository.create({
      eventType: EventType.TICKET_CREATED,
      ticketId: payload.ticketId,
      actorId: payload.actorId,
      description: `Ticket #${payload.ticketNumber} created by ${payload.actorName}`,
      metadata: {
        priority: payload.priority,
        category: payload.category,
      } as Prisma.InputJsonValue,
    });
  });

  eventBus.on(EventType.TICKET_UPDATED, async (payload) => {
    await activityLogRepository.create({
      eventType: EventType.TICKET_UPDATED,
      ticketId: payload.ticketId,
      actorId: payload.actorId,
      description: `Ticket updated (${payload.changedFields.join(', ')}) by ${payload.actorName}`,
      metadata: {
        changedFields: payload.changedFields,
        previousValues: payload.previousValues,
        newValues: payload.newValues,
      } as Prisma.InputJsonValue,
    });
  });

  eventBus.on(EventType.TICKET_STATUS_CHANGED, async (payload) => {
    await activityLogRepository.create({
      eventType: EventType.TICKET_STATUS_CHANGED,
      ticketId: payload.ticketId,
      actorId: payload.actorId,
      description: `Status changed from ${payload.fromStatus} to ${payload.toStatus} by ${payload.actorName}`,
      metadata: {
        fromStatus: payload.fromStatus,
        toStatus: payload.toStatus,
      } as Prisma.InputJsonValue,
    });
  });

  eventBus.on(EventType.COMMENT_ADDED, async (payload) => {
    await activityLogRepository.create({
      eventType: EventType.COMMENT_ADDED,
      ticketId: payload.ticketId,
      actorId: payload.actorId,
      description: `${payload.actorName} added a comment: "${payload.commentPreview}"`,
      metadata: {
        commentId: payload.commentId,
      } as Prisma.InputJsonValue,
    });
  });

  eventBus.on(EventType.TICKET_RESOLVED, async (payload) => {
    await activityLogRepository.create({
      eventType: EventType.TICKET_RESOLVED,
      ticketId: payload.ticketId,
      actorId: payload.actorId,
      description: `Ticket marked as RESOLVED by ${payload.actorName}`,
      metadata: {
        fromStatus: payload.fromStatus,
        resolvedAt: payload.resolvedAt.toISOString(),
      } as Prisma.InputJsonValue,
    });
  });
}
