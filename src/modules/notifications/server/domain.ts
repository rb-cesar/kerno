import { prisma } from "@/core/db";
import type { NotificationDTO, NotificationRecipient } from "../types";

export const NOTIFICATIONS_PAGE_SIZE = 50;

export class NotificationDomain {
  private toDTO(row: {
    id: string;
    title: string;
    body: string | null;
    link: string | null;
    readAt: Date | null;
    createdAt: Date;
    event: { type: string };
  }): NotificationDTO {
    return {
      id: row.id,
      type: row.event.type,
      title: row.title,
      body: row.body,
      link: row.link,
      read: row.readAt !== null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** `before`: só notificações criadas antes desse instante — paginação por cursor. */
  async list(userId: string, before?: Date): Promise<NotificationDTO[]> {
    const rows = await prisma.notification.findMany({
      where: { userId, ...(before ? { createdAt: { lt: before } } : {}) },
      orderBy: { createdAt: "desc" },
      take: NOTIFICATIONS_PAGE_SIZE,
      include: { event: { select: { type: true } } },
    });
    return rows.map((row) => this.toDTO(row));
  }

  async unreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /** Cria uma notificação por destinatário para o evento — chamada pela composição do app. */
  async notify(
    eventId: string,
    recipients: NotificationRecipient[],
  ): Promise<{ userId: string; dto: NotificationDTO }[]> {
    if (recipients.length === 0) return [];

    const rows = await prisma.$transaction(
      recipients.map((r) =>
        prisma.notification.create({
          data: {
            eventId,
            userId: r.userId,
            title: r.title,
            body: r.body ?? null,
            link: r.link ?? null,
          },
          include: { event: { select: { type: true } } },
        }),
      ),
    );
    return rows.map((row) => ({ userId: row.userId, dto: this.toDTO(row) }));
  }
}

export function createNotificationDomain(): NotificationDomain {
  return new NotificationDomain();
}

/** Instância pronta pra uso — stateless, sem motivo pra cada consumidor criar a sua. */
export const notificationDomain = createNotificationDomain();
