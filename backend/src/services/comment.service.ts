import { EventType, Role } from '@prisma/client';
import { eventBus } from '../events/eventBus';
import { AuthenticatedUser } from '../middlewares/auth.middleware';
import { commentRepository } from '../repositories/comment.repository';
import { ticketRepository } from '../repositories/ticket.repository';
import { ForbiddenError, NotFoundError } from '../utils/errors';

export const commentService = {
  async addComment(actor: AuthenticatedUser, ticketId: string, content: string) {
    const ticket = await ticketRepository.findByIdBasic(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket');
    }

    if (actor.role !== Role.ADMIN && ticket.createdById !== actor.id) {
      throw new ForbiddenError('You can only comment on your own support tickets');
    }

    const comment = await commentRepository.create({
      content,
      ticketId,
      authorId: actor.id,
    });

    const preview = content.length > 80 ? `${content.slice(0, 77)}...` : content;

    eventBus.emit(EventType.COMMENT_ADDED, {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      ticketTitle: ticket.title,
      ticketCreatedById: ticket.createdById,
      assignedToId: ticket.assignedToId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      commentId: comment.id,
      commentPreview: preview,
      occurredAt: new Date(),
    });

    return comment;
  },

  async getComments(actor: AuthenticatedUser, ticketId: string) {
    const ticket = await ticketRepository.findByIdBasic(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket');
    }

    if (actor.role !== Role.ADMIN && ticket.createdById !== actor.id) {
      throw new ForbiddenError('You can only view comments on your own support tickets');
    }

    return commentRepository.findByTicketId(ticketId);
  },
};
