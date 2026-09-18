import type { NotificationsData } from "../types";
import { notificationDomain } from "./domain";

/**
 * Notificações são sempre escopadas ao próprio usuário (sem recurso de outro
 * dono pra checar) — não há guards de permissão aqui, diferente dos outros
 * módulos.
 */
export class NotificationService {
  async listForUser(userId: string): Promise<NotificationsData> {
    const [items, unreadCount] = await Promise.all([
      notificationDomain.list(userId),
      notificationDomain.unreadCount(userId),
    ]);
    return { items, unreadCount };
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
