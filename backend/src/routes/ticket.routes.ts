import { Role } from '@prisma/client';
import { Router } from 'express';
import { commentController } from '../controllers/comment.controller';
import { ticketController } from '../controllers/ticket.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { createCommentSchema } from '../validators/comment.validator';
import {
  adminUpdateTicketSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  ticketIdParamSchema,
  updateTicketSchema,
} from '../validators/ticket.validator';

const router = Router();

router.use(authenticate);

router.post('/', validate(createTicketSchema), asyncHandler(ticketController.create));

router.get('/', validate(listTicketsQuerySchema), asyncHandler(ticketController.list));

router.get('/:id', validate(ticketIdParamSchema), asyncHandler(ticketController.getById));

router.patch('/:id', validate(updateTicketSchema), asyncHandler(ticketController.update));

router.patch(
  '/:id/admin',
  authorize(Role.ADMIN),
  validate(adminUpdateTicketSchema),
  asyncHandler(ticketController.adminUpdate)
);

router.delete('/:id', validate(ticketIdParamSchema), asyncHandler(ticketController.remove));

router.get(
  '/:id/comments',
  validate(ticketIdParamSchema),
  asyncHandler(commentController.list)
);

router.post(
  '/:id/comments',
  validate(createCommentSchema),
  asyncHandler(commentController.create)
);

export default router;
