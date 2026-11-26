import { Role, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { AuthenticatedUser } from '../middlewares/auth.middleware';
import { ticketRepository } from '../repositories/ticket.repository';

export const dashboardService = {
  async getStats(actor: AuthenticatedUser) {
    const scopedUserId = actor.role === Role.ADMIN ? undefined : actor.id;
    const raw = await ticketRepository.getStats(scopedUserId);

    const statusCounts: Record<TicketStatus, number> = {
      [TicketStatus.OPEN]: 0,
      [TicketStatus.IN_PROGRESS]: 0,
      [TicketStatus.RESOLVED]: 0,
      [TicketStatus.CLOSED]: 0,
    };

    raw.byStatus.forEach((row) => {
      statusCounts[row.status] = row._count._all;
    });

    const priorityCounts: Record<TicketPriority, number> = {
      [TicketPriority.LOW]: 0,
      [TicketPriority.MEDIUM]: 0,
      [TicketPriority.HIGH]: 0,
      [TicketPriority.URGENT]: 0,
    };

    raw.byPriority.forEach((row) => {
      priorityCounts[row.priority] = row._count._all;
    });

    const categoryCounts: Record<TicketCategory, number> = {
      [TicketCategory.TECHNICAL]: 0,
      [TicketCategory.BILLING]: 0,
      [TicketCategory.ACCOUNT]: 0,
      [TicketCategory.FEATURE_REQUEST]: 0,
      [TicketCategory.GENERAL]: 0,
    };

    raw.byCategory.forEach((row) => {
      categoryCounts[row.category] = row._count._all;
    });

    const resolvedTotal =
      statusCounts[TicketStatus.RESOLVED] + statusCounts[TicketStatus.CLOSED];
    const resolutionRate =
      raw.total > 0 ? Math.round((resolvedTotal / raw.total) * 100) : 0;

    return {
      total: raw.total,
      resolutionRate,
      statusCounts,
      priorityCounts,
      categoryCounts,
      recentTickets: raw.recentTickets,
    };
  },
};
