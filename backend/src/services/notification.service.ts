import { notificationRepository } from '../repositories/notification.repository';
import { NotFoundError } from '../utils/errors';

export const notificationService = {
  async listUserNotifications(userId: string, unreadOnly = false) {
    const [items, unreadCount] = await Promise.all([
      notificationRepository.findByUserId(userId, unreadOnly),
      notificationRepository.countUnread(userId),
    ]);

    return { items, unreadCount };
  },

  async markAsRead(userId: string, notificationId: string) {
    const result = await notificationRepository.markAsRead(notificationId, userId);
    if (result.count === 0) {
      throw new NotFoundError('Notification');
    }
    return { id: notificationId, isRead: true };
  },

  async markAllAsRead(userId: string) {
    const result = await notificationRepository.markAllAsRead(userId);
    return { updatedCount: result.count };
  },
};
