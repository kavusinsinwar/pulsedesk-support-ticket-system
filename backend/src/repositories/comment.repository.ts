import { prisma } from '../config/prisma';

export const commentRepository = {
  async create(data: { content: string; ticketId: string; authorId: string }) {
    return prisma.comment.create({
      data,
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  },

  async findByTicketId(ticketId: string) {
    return prisma.comment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  },
};
