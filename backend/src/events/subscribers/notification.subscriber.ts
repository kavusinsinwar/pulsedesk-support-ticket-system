import { EventType, Role, TicketStatus } from '@prisma/client';
import { eventBus } from '../eventBus';
import { emitRealtimeNotification } from '../../realtime/socketServer';
import { notificationRepository } from '../../repositories/notification.repository';
import { userRepository } from '../../repositories/user.repository';

export function registerNotificationSubscribers(): void {
  eventBus.on(EventType.TICKET_CREATED, async (payload) => {
    const admins = await userRepository.findByRole(Role.ADMIN);
    const recipients = admins.filter((admin) => admin.id !== payload.actorId);
    if (recipients.length === 0) return;

    await notificationRepository.createMany(
      recipients.map((admin) => ({
        userId: admin.id,
        ticketId: payload.ticketId,
        eventType: EventType.TICKET_CREATED,
        title: `New ${payload.priority} Ticket #${payload.ticketNumber}`,
        message: `${payload.actorName} submitted "${payload.ticketTitle}".`,
      }))
    );
    emitRealtimeNotification(recipients.map((a) => a.id));
  });

  eventBus.on(EventType.TICKET_UPDATED, async (payload) => {
    if (payload.actorId === payload.ticketCreatedById) return;

    await notificationRepository.create({
      userId: payload.ticketCreatedById,
      ticketId: payload.ticketId,
      eventType: EventType.TICKET_UPDATED,
      title: `Ticket #${payload.ticketNumber} Updated`,
      message: `${payload.actorName} updated ${payload.changedFields.join(', ')} on "${payload.ticketTitle}".`,
    });
    emitRealtimeNotification([payload.ticketCreatedById]);
  });

  eventBus.on(EventType.TICKET_STATUS_CHANGED, async (payload) => {
    if (payload.actorId === payload.ticketCreatedById) return;
    if (payload.toStatus === TicketStatus.RESOLVED) return;

    await notificationRepository.create({
      userId: payload.ticketCreatedById,
      ticketId: payload.ticketId,
      eventType: EventType.TICKET_STATUS_CHANGED,
      title: `Ticket #${payload.ticketNumber} Status Changed`,
      message: `Status moved from ${payload.fromStatus} to ${payload.toStatus} on "${payload.ticketTitle}".`,
    });
    emitRealtimeNotification([payload.ticketCreatedById]);
  });

  eventBus.on(EventType.TICKET_RESOLVED, async (payload) => {
    if (payload.actorId === payload.ticketCreatedById) return;

    await notificationRepository.create({
      userId: payload.ticketCreatedById,
      ticketId: payload.ticketId,
      eventType: EventType.TICKET_RESOLVED,
      title: `Ticket #${payload.ticketNumber} Resolved`,
      message: `Your ticket "${payload.ticketTitle}" has been marked as RESOLVED by ${payload.actorName}.`,
    });
    emitRealtimeNotification([payload.ticketCreatedById]);
  });

  eventBus.on(EventType.COMMENT_ADDED, async (payload) => {
    if (payload.actorRole === Role.ADMIN) {
      if (payload.actorId !== payload.ticketCreatedById) {
        await notificationRepository.create({
          userId: payload.ticketCreatedById,
          ticketId: payload.ticketId,
          eventType: EventType.COMMENT_ADDED,
          title: `New Reply on Ticket #${payload.ticketNumber}`,
          message: `${payload.actorName}: "${payload.commentPreview}"`,
        });
        emitRealtimeNotification([payload.ticketCreatedById]);
      }
      return;
    }

    // User commented: notify assigned admin, or all admins if unassigned
    if (payload.assignedToId && payload.assignedToId !== payload.actorId) {
      await notificationRepository.create({
        userId: payload.assignedToId,
        ticketId: payload.ticketId,
        eventType: EventType.COMMENT_ADDED,
        title: `New Comment on Ticket #${payload.ticketNumber}`,
        message: `${payload.actorName}: "${payload.commentPreview}"`,
      });
      emitRealtimeNotification([payload.assignedToId]);
      return;
    }

    const admins = await userRepository.findByRole(Role.ADMIN);
    const recipients = admins.filter((admin) => admin.id !== payload.actorId);
    if (recipients.length === 0) return;

    await notificationRepository.createMany(
      recipients.map((admin) => ({
        userId: admin.id,
        ticketId: payload.ticketId,
        eventType: EventType.COMMENT_ADDED,
        title: `New Comment on Ticket #${payload.ticketNumber}`,
        message: `${payload.actorName}: "${payload.commentPreview}"`,
      }))
    );
    emitRealtimeNotification(recipients.map((a) => a.id));
  });
}
