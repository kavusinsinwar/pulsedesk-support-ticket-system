import { EventType } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface CreateNotificationInput {
  userId: string;
  ticketId?: string;
  eventType: EventType;
  title: string;
  message: string;
}

export const notificationRepository = {
  async create(data: CreateNotificationInput) {
    return prisma.notification.create({ data });
  },

  async createMany(data: CreateNotificationInput[]) {
    return prisma.notification.createMany({ data });
  },

  async findByUserId(userId: string, unreadOnly = false, limit = 30) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  async countUnread(userId: string) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  },

  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },
};
