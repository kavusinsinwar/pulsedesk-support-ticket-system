import { EventType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export const activityLogRepository = {
  async create(data: {
    eventType: EventType;
    description: string;
    metadata?: Prisma.InputJsonValue;
    ticketId: string;
    actorId: string;
  }) {
    return prisma.activityLog.create({
      data,
    });
  },

  async findByTicketId(ticketId: string) {
    return prisma.activityLog.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  },
};
