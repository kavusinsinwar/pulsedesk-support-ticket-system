import { Request, Response } from 'express';
import { ticketService } from '../services/ticket.service';
import { sendSuccess } from '../utils/response';

export const ticketController = {
  async create(req: Request, res: Response): Promise<void> {
    const ticket = await ticketService.createTicket(req.user!, req.body);
    sendSuccess(res, { ticket }, 'Support ticket created successfully', 201);
  },

  async list(req: Request, res: Response): Promise<void> {
    const result = await ticketService.listTickets(req.user!, req.query as never);
    sendSuccess(res, result.items, 'Tickets fetched successfully', 200, result.meta);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const ticket = await ticketService.getTicketById(req.user!, req.params.id);
    sendSuccess(res, { ticket }, 'Ticket details fetched successfully');
  },

  async update(req: Request, res: Response): Promise<void> {
    const ticket = await ticketService.updateTicketByOwner(req.user!, req.params.id, req.body);
    sendSuccess(res, { ticket }, 'Ticket updated successfully');
  },

  async adminUpdate(req: Request, res: Response): Promise<void> {
    const ticket = await ticketService.adminUpdateTicket(req.user!, req.params.id, req.body);
    sendSuccess(res, { ticket }, 'Ticket updated by administrator');
  },

  async remove(req: Request, res: Response): Promise<void> {
    const result = await ticketService.deleteTicket(req.user!, req.params.id);
    sendSuccess(res, result, 'Ticket deleted successfully');
  },
};
