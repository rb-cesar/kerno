import type { NotificationsData } from "../types";
import { notificationDomain } from "./domain";

/**
 * Notificações são sempre escopadas ao próprio usuário (sem recurso de outro
 * dono pra checar) — não há guards de permissão aqui, diferente dos outros
 * módulos.
 */
export class NotificationService {
  async listForUser(userId: string, beforeId?: string): Promise<NotificationsData> {
    const [page, unreadCount] = await Promise.all([
      notificationDomain.list(userId, beforeId),
      notificationDomain.unreadCount(userId),
    ]);
    return { items: page.items, unreadCount, hasMore: page.hasMore };
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await notificationDomain.markRead(userId, notificationId);
  }

  async markAllRead(userId: string): Promise<void> {
    await notificationDomain.markAllRead(userId);
  }
}

export function createNotificationService(): NotificationService {
  return new NotificationService();
}
