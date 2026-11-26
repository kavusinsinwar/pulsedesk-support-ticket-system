import { Prisma, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { prisma } from '../config/prisma';

const ticketSummaryInclude = {
  createdBy: {
    select: { id: true, name: true, email: true, role: true },
  },
  assignedTo: {
    select: { id: true, name: true, email: true, role: true },
  },
  _count: {
    select: { comments: true },
  },
} satisfies Prisma.TicketInclude;

const ticketDetailInclude = {
  createdBy: {
    select: { id: true, name: true, email: true, role: true },
  },
  assignedTo: {
    select: { id: true, name: true, email: true, role: true },
  },
  comments: {
    orderBy: { createdAt: 'asc' },
    include: {
      author: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  },
  activityLogs: {
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  },
} satisfies Prisma.TicketInclude;

export interface TicketListFilter {
  createdById?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  search?: string;
  sortBy: 'createdAt' | 'updatedAt' | 'priority' | 'status';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export const ticketRepository = {
  async create(data: {
    title: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    createdById: string;
  }) {
    return prisma.ticket.create({
      data,
      include: ticketSummaryInclude,
    });
  },

  async findById(id: string) {
    return prisma.ticket.findUnique({
      where: { id },
      include: ticketDetailInclude,
    });
  },

  async findByIdBasic(id: string) {
    return prisma.ticket.findUnique({
      where: { id },
      include: ticketSummaryInclude,
    });
  },

  async findMany(filter: TicketListFilter) {
    const where: Prisma.TicketWhereInput = {
      ...(filter.createdById ? { createdById: filter.createdById } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.priority ? { priority: filter.priority } : {}),
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.search
        ? {
            OR: [
              { title: { contains: filter.search, mode: 'insensitive' } },
              { description: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const skip = (filter.page - 1) * filter.limit;

    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: ticketSummaryInclude,
        orderBy: { [filter.sortBy]: filter.sortOrder },
        skip,
        take: filter.limit,
      }),
      prisma.ticket.count({ where }),
    ]);

    return { items, total };
  },

  async update(
    id: string,
    data: Prisma.TicketUpdateInput
  ) {
    return prisma.ticket.update({
      where: { id },
      data,
      include: ticketDetailInclude,
    });
  },

  async delete(id: string) {
    return prisma.ticket.delete({
      where: { id },
    });
  },

  async getStats(createdById?: string) {
    const where: Prisma.TicketWhereInput = createdById ? { createdById } : {};

    const [total, byStatus, byPriority, byCategory, recentTickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      prisma.ticket.groupBy({
        by: ['priority'],
        where,
        _count: { _all: true },
      }),
      prisma.ticket.groupBy({
        by: ['category'],
        where,
        _count: { _all: true },
      }),
      prisma.ticket.findMany({
        where,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: ticketSummaryInclude,
      }),
    ]);

    return { total, byStatus, byPriority, byCategory, recentTickets };
  },
};
