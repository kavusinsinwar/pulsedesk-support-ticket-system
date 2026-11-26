import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/response';

export const notificationController = {
  async list(req: Request, res: Response): Promise<void> {
    const unreadOnly = req.query.unreadOnly === 'true';
    const result = await notificationService.listUserNotifications(req.user!.id, unreadOnly);
    sendSuccess(res, result, 'Notifications fetched successfully');
  },

  async markAsRead(req: Request, res: Response): Promise<void> {
    const result = await notificationService.markAsRead(req.user!.id, req.params.id);
    sendSuccess(res, result, 'Notification marked as read');
  },

  async markAllAsRead(req: Request, res: Response): Promise<void> {
    const result = await notificationService.markAllAsRead(req.user!.id);
    sendSuccess(res, result, 'All notifications marked as read');
  },
};
