import type { NotificationsData } from "../types";
import { NOTIFICATIONS_PAGE_SIZE, notificationDomain } from "./domain";

/**
 * Notificações são sempre escopadas ao próprio usuário (sem recurso de outro
 * dono pra checar) — não há guards de permissão aqui, diferente dos outros
 * módulos.
 */
export class NotificationService {
  async listForUser(userId: string, before?: Date): Promise<NotificationsData> {
    const [items, unreadCount] = await Promise.all([
      notificationDomain.list(userId, before),
      notificationDomain.unreadCount(userId),
    ]);
    return { items, unreadCount, hasMore: items.length === NOTIFICATIONS_PAGE_SIZE };
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
