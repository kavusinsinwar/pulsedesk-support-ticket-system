import { z } from 'zod';

export const createCommentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ticket ID format'),
  }),
  body: z.object({
    content: z
      .string()
      .trim()
      .min(1, 'Comment cannot be empty')
      .max(2000, 'Comment cannot exceed 2000 characters'),
  }),
});
