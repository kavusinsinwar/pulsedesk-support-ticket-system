import { EventType, Role, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockActivityLogRepo, mockNotificationRepo, mockUserRepo } = vi.hoisted(() => ({
  mockActivityLogRepo: {
    create: vi.fn(),
    findByTicketId: vi.fn(),
  },
  mockNotificationRepo: {
    create: vi.fn(),
    createMany: vi.fn(),
    findByUserId: vi.fn(),
    countUnread: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
  mockUserRepo: {
    findByRole: vi.fn(),
  },
}));

vi.mock('../src/repositories/activityLog.repository', () => ({
  activityLogRepository: mockActivityLogRepo,
}));
vi.mock('../src/repositories/notification.repository', () => ({
  notificationRepository: mockNotificationRepo,
}));
vi.mock('../src/repositories/user.repository', () => ({
  userRepository: mockUserRepo,
}));

import { initializeEventSubscribers, resetEventSubscribers } from '../src/events';
import { eventBus } from '../src/events/eventBus';

describe('DomainEventBus & Subscribers', () => {
  beforeEach(() => {
    resetEventSubscribers();
    initializeEventSubscribers();
    vi.clearAllMocks();
    mockActivityLogRepo.create.mockResolvedValue({ id: 'log-1' });
    mockNotificationRepo.create.mockResolvedValue({ id: 'notif-1' });
    mockNotificationRepo.createMany.mockResolvedValue({ count: 1 });
    mockUserRepo.findByRole.mockResolvedValue([{ id: 'admin-1', role: Role.ADMIN }]);
  });

  it('logs activity and notifies creator on TICKET_STATUS_CHANGED (non-RESOLVED)', async () => {
    eventBus.emit(EventType.TICKET_STATUS_CHANGED, {
      ticketId: 'ticket-1',
      ticketNumber: 42,
      ticketTitle: 'Slow dashboard query',
      ticketCreatedById: 'user-1',
      assignedToId: 'admin-1',
      actorId: 'admin-1',
      actorName: 'Alex Admin',
      actorRole: Role.ADMIN,
      fromStatus: TicketStatus.OPEN,
      toStatus: TicketStatus.IN_PROGRESS,
      occurredAt: new Date(),
    });

    await new Promise((r) => setTimeout(r, 20));

    expect(mockActivityLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: EventType.TICKET_STATUS_CHANGED,
        ticketId: 'ticket-1',
      })
    );
    expect(mockNotificationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        eventType: EventType.TICKET_STATUS_CHANGED,
      })
    );
  });

  it('isolates subscriber errors without crashing emitter', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockActivityLogRepo.create.mockRejectedValueOnce(new Error('DB temporarily unavailable'));

    expect(() => {
      eventBus.emit(EventType.TICKET_CREATED, {
        ticketId: 'ticket-2',
        ticketNumber: 43,
        ticketTitle: 'Login crash',
        ticketCreatedById: 'user-1',
        actorId: 'user-1',
        actorName: 'Sarah',
        actorRole: Role.USER,
        priority: TicketPriority.URGENT,
        category: TicketCategory.TECHNICAL,
        occurredAt: new Date(),
      });
    }).not.toThrow();

    await new Promise((r) => setTimeout(r, 20));
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
