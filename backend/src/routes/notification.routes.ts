import { Router } from 'express';
import { z } from 'zod';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const notificationIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid notification ID format'),
  }),
});

router.use(authenticate);

router.get('/', asyncHandler(notificationController.list));
router.patch('/read-all', asyncHandler(notificationController.markAllAsRead));
router.patch(
  '/:id/read',
  validate(notificationIdSchema),
  asyncHandler(notificationController.markAsRead)
);

export default router;
