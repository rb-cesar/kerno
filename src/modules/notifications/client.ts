"use client";

import { request } from "@/core/request";
import type { NotificationsData } from "./types";

// Chamadas HTTP do módulo Notifications — mesma origem (/api/notifications/...).

export const notificationsClient = {
  fetch: (before?: string): Promise<NotificationsData> =>
    request<NotificationsData>(before ? `/notifications?before=${encodeURIComponent(before)}` : "/notifications").catch(
      () => ({ items: [], unreadCount: 0, hasMore: false }),
    ),

  markRead: (id: string): Promise<void> => request(`/notifications/${id}/read`, { method: "POST" }),

  markAllRead: (): Promise<void> => request("/notifications/read-all", { method: "POST" }),
};
