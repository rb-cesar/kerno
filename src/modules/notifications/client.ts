"use client";

import { request } from "@/core/request";
import type { NotificationsData } from "./types";

// Chamadas HTTP do módulo Notifications — mesma origem (/api/notifications/...).

export const notificationsClient = {
  fetch: (): Promise<NotificationsData> =>
    request<NotificationsData>("/notifications").catch(() => ({ items: [], unreadCount: 0 })),

  markRead: (id: string): Promise<void> => request(`/notifications/${id}/read`, { method: "POST" }),

  markAllRead: (): Promise<void> => request("/notifications/read-all", { method: "POST" }),
};
