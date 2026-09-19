// Contratos do módulo Notifications.

export interface NotificationDTO {
  id: string;
  type: string; // KernoEventType do evento de origem (ver @/core/events)
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string; // ISO
}

export interface NotificationsData {
  items: NotificationDTO[];
  unreadCount: number;
  /** Se true, a página veio cheia — provavelmente há mais itens mais antigos. */
  hasMore: boolean;
}

export interface NotificationsPage {
  items: NotificationDTO[];
  hasMore: boolean;
}

/** Destinatário de um evento — decidido pela composição do app (ver server/notification-dispatcher). */
export interface NotificationRecipient {
  userId: string;
  title: string;
  body?: string | null;
  link?: string | null;
}
