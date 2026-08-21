import { prisma } from '../lib/prisma';
import { getIO } from '../socket/instance';
import { getPagination, paginate } from '../types';

export class NotificationService {
  async getNotifications(userId: string, query: {
    page?: string;
    limit?: string;
    isRead?: string;
  }) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Record<string, unknown> = { userId };
    if (query.isRead !== undefined) where.isRead = query.isRead === 'true';

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    content: string;
    relatedId?: string;
    relatedType?: string;
  }) {
    const notification = await prisma.notification.create({ data });

    // Push via Socket.io
    const io = getIO();
    if (io) {
      io.of('/notification').to(`user:${data.userId}`).emit('new_notification', notification);
    }

    return notification;
  }

  async sendCameraAlert(userId: string, deviceId: string, message: string) {
    const notification = await this.createNotification({
      userId,
      type: 'camera_alert',
      title: 'カメラアラート',
      content: message,
      relatedId: deviceId,
      relatedType: 'smart_device',
    });

    const io = getIO();
    if (io) {
      io.of('/notification').to(`user:${userId}`).emit('camera_alert', {
        deviceId,
        message,
        notificationId: notification.id,
      });
    }

    return notification;
  }
}

export const notificationService = new NotificationService();
