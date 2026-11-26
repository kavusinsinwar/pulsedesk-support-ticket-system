import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { z } from 'zod';

export const ticketIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ticket ID format'),
  }),
});

export const createTicketSchema = z.object({
  body: z.object({
    title: z.string().trim().min(5, 'Title must be at least 5 characters').max(150),
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(4000),
    category: z.nativeEnum(TicketCategory).default(TicketCategory.GENERAL),
    priority: z.nativeEnum(TicketPriority).default(TicketPriority.MEDIUM),
  }),
});

export const updateTicketSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ticket ID format'),
  }),
  body: z
    .object({
      title: z.string().trim().min(5).max(150).optional(),
      description: z.string().trim().min(10).max(4000).optional(),
      category: z.nativeEnum(TicketCategory).optional(),
      priority: z.nativeEnum(TicketPriority).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

export const adminUpdateTicketSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ticket ID format'),
  }),
  body: z
    .object({
      status: z.nativeEnum(TicketStatus).optional(),
      priority: z.nativeEnum(TicketPriority).optional(),
      assignedToId: z.string().uuid('Invalid assignee ID').nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field (status, priority, or assignedToId) must be provided',
    }),
});

export const listTicketsQuerySchema = z.object({
  query: z.object({
    status: z.nativeEnum(TicketStatus).optional(),
    priority: z.nativeEnum(TicketPriority).optional(),
    category: z.nativeEnum(TicketCategory).optional(),
    search: z.string().trim().max(100).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
});
