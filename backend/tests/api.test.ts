import { EventType, Role, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-at-least-16-chars';

const {
  mockUserRepo,
  mockTicketRepo,
  mockCommentRepo,
  mockActivityLogRepo,
  mockNotificationRepo,
} = vi.hoisted(() => ({
  mockUserRepo: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findByRole: vi.fn(),
    create: vi.fn(),
  },
  mockTicketRepo: {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdBasic: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
  },
  mockCommentRepo: {
    create: vi.fn(),
    findByTicketId: vi.fn(),
  },
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
}));

vi.mock('../src/repositories/user.repository', () => ({
  userRepository: mockUserRepo,
}));
vi.mock('../src/repositories/ticket.repository', () => ({
  ticketRepository: mockTicketRepo,
}));
vi.mock('../src/repositories/comment.repository', () => ({
  commentRepository: mockCommentRepo,
}));
vi.mock('../src/repositories/activityLog.repository', () => ({
  activityLogRepository: mockActivityLogRepo,
}));
vi.mock('../src/repositories/notification.repository', () => ({
  notificationRepository: mockNotificationRepo,
}));

import { createApp } from '../src/app';
import { initializeEventSubscribers, resetEventSubscribers } from '../src/events';
import { signJwt } from '../src/utils/jwt';
import { hashPassword } from '../src/utils/password';

const app = createApp();

const userId = '11111111-1111-4111-8111-111111111111';
const otherUserId = '22222222-2222-4222-8222-222222222222';
const adminId = '33333333-3333-4333-8333-333333333333';
const ticketId = '44444444-4444-4444-8444-444444444444';

const regularUser = {
  id: userId,
  name: 'Sarah Chen',
  email: 'sarah@example.com',
  role: Role.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const adminUser = {
  id: adminId,
  name: 'Alex Morgan',
  email: 'admin@helpdesk.dev',
  role: Role.ADMIN,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const userToken = signJwt({
  sub: regularUser.id,
  email: regularUser.email,
  role: regularUser.role,
  name: regularUser.name,
});

const adminToken = signJwt({
  sub: adminUser.id,
  email: adminUser.email,
  role: adminUser.role,
  name: adminUser.name,
});

describe('Support Ticket System API', () => {
  beforeEach(() => {
    resetEventSubscribers();
    initializeEventSubscribers();
    vi.clearAllMocks();

    mockUserRepo.findById.mockImplementation(async (id: string) => {
      if (id === userId) return regularUser;
      if (id === adminId) return adminUser;
      return null;
    });
    mockUserRepo.findByRole.mockResolvedValue([adminUser]);
    mockActivityLogRepo.create.mockResolvedValue({ id: 'log-1' });
    mockNotificationRepo.create.mockResolvedValue({ id: 'notif-1' });
    mockNotificationRepo.createMany.mockResolvedValue({ count: 1 });
  });

  describe('Health & Auth', () => {
    it('GET /health returns 200 healthy', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });

    it('POST /api/v1/auth/register creates a USER account (ignoring any role injection) and returns JWT', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(regularUser);

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Sarah Chen',
        email: 'sarah@example.com',
        password: 'Password123',
        role: 'ADMIN',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeTruthy();
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.USER })
      );
    });

    it('POST /api/v1/auth/register returns 422 for weak password', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Sarah Chen',
        email: 'sarah@example.com',
        password: 'weak',
      });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/v1/auth/login succeeds with valid credentials', async () => {
      const passwordHash = await hashPassword('Password123');
      mockUserRepo.findByEmail.mockResolvedValue({
        ...regularUser,
        passwordHash,
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'sarah@example.com',
        password: 'Password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeTruthy();
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });
  });

  describe('Ticket RBAC & Lifecycle', () => {
    it('rejects unauthenticated access to /api/v1/tickets with 401', async () => {
      const res = await request(app).get('/api/v1/tickets');
      expect(res.status).toBe(401);
    });

    it('POST /api/v1/tickets creates a ticket and triggers TICKET_CREATED subscribers', async () => {
      const createdTicket = {
        id: ticketId,
        ticketNumber: 1,
        title: 'Cannot connect SSO provider',
        description: 'SAML login fails with invalid assertion error.',
        category: TicketCategory.TECHNICAL,
        priority: TicketPriority.HIGH,
        status: TicketStatus.OPEN,
        createdById: userId,
        assignedToId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockTicketRepo.create.mockResolvedValue(createdTicket);

      const res = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Cannot connect SSO provider',
          description: 'SAML login fails with invalid assertion error.',
          category: 'TECHNICAL',
          priority: 'HIGH',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.ticket.id).toBe(ticketId);

      await new Promise((r) => setTimeout(r, 20));
      expect(mockActivityLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: EventType.TICKET_CREATED,
          ticketId,
        })
      );
      expect(mockNotificationRepo.createMany).toHaveBeenCalledTimes(1);
    });

    it('prevents USER from viewing another user ticket (403)', async () => {
      mockTicketRepo.findById.mockResolvedValue({
        id: ticketId,
        createdById: otherUserId,
        status: TicketStatus.OPEN,
      });

      const res = await request(app)
        .get(`/api/v1/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('prevents USER from editing ticket once status is IN_PROGRESS (400)', async () => {
      mockTicketRepo.findByIdBasic.mockResolvedValue({
        id: ticketId,
        createdById: userId,
        status: TicketStatus.IN_PROGRESS,
      });

      const res = await request(app)
        .patch(`/api/v1/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Updated ticket title' });

      expect(res.status).toBe(400);
    });

    it('prevents USER from accessing admin status endpoint (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/admin`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: TicketStatus.RESOLVED });

      expect(res.status).toBe(403);
    });

    it('allows ADMIN to resolve a ticket and emits TICKET_RESOLVED event', async () => {
      mockTicketRepo.findByIdBasic.mockResolvedValue({
        id: ticketId,
        ticketNumber: 1,
        title: 'Cannot connect SSO provider',
        createdById: userId,
        assignedToId: adminId,
        status: TicketStatus.IN_PROGRESS,
        priority: TicketPriority.HIGH,
      });

      mockTicketRepo.update.mockResolvedValue({
        id: ticketId,
        ticketNumber: 1,
        title: 'Cannot connect SSO provider',
        createdById: userId,
        assignedToId: adminId,
        status: TicketStatus.RESOLVED,
        priority: TicketPriority.HIGH,
      });

      const res = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/admin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: TicketStatus.RESOLVED });

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe(TicketStatus.RESOLVED);

      await new Promise((r) => setTimeout(r, 20));
      expect(mockActivityLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: EventType.TICKET_RESOLVED,
          ticketId,
        })
      );
      expect(mockNotificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          eventType: EventType.TICKET_RESOLVED,
        })
      );
    });

    it('rejects invalid status transition CLOSED -> RESOLVED with 400', async () => {
      mockTicketRepo.findByIdBasic.mockResolvedValue({
        id: ticketId,
        createdById: userId,
        status: TicketStatus.CLOSED,
      });

      const res = await request(app)
        .patch(`/api/v1/tickets/${ticketId}/admin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: TicketStatus.RESOLVED });

      expect(res.status).toBe(400);
    });
  });

  describe('Comments', () => {
    it('allows ticket owner to add comment and triggers COMMENT_ADDED event', async () => {
      mockTicketRepo.findByIdBasic.mockResolvedValue({
        id: ticketId,
        ticketNumber: 1,
        title: 'Cannot connect SSO provider',
        createdById: userId,
        assignedToId: adminId,
        status: TicketStatus.OPEN,
      });
      mockCommentRepo.create.mockResolvedValue({
        id: 'comment-1',
        content: 'Here are additional logs.',
        ticketId,
        authorId: userId,
        author: regularUser,
      });

      const res = await request(app)
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Here are additional logs.' });

      expect(res.status).toBe(201);
      await new Promise((r) => setTimeout(r, 20));
      expect(mockActivityLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: EventType.COMMENT_ADDED })
      );
      expect(mockNotificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: adminId, eventType: EventType.COMMENT_ADDED })
      );
    });
  });
});
