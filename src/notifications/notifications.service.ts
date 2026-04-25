import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Notification, NotificationType } from '@prisma/client';
import { EventsGateway } from '../gateway/events.gateway';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EventsGateway))
    private gateway: EventsGateway,
  ) {}

  findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Bittagina foydalanuvchiga bildirishnoma yaratadi va socket orqali
   * shaxsiy "user:${id}" room'iga push qiladi.
   */
  async pushToUser(
    userId: string,
    payload: NotificationPayload,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: { userId, ...payload },
    });
    try {
      this.gateway.notifyUser(userId, 'new_notification', notification);
    } catch (err) {
      this.logger.warn(
        `Socket push xatoligi (user=${userId}): ${(err as Error).message}`,
      );
    }
    return notification;
  }

  /**
   * Bir nechta foydalanuvchilarga bir vaqtda bildirishnoma yuboradi.
   * Har biri uchun DB yozuvi yaratiladi va socket push qilinadi.
   */
  async pushToUsers(
    userIds: string[],
    payload: NotificationPayload,
  ): Promise<Notification[]> {
    const unique = [...new Set(userIds)].filter(Boolean);
    if (unique.length === 0) return [];

    return Promise.all(unique.map((uid) => this.pushToUser(uid, payload)));
  }
}
