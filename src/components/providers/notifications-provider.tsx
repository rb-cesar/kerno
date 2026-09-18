"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { notificationsClient } from "@/modules/notifications/client";
import type { NotificationDTO } from "@/modules/notifications/types";
import { useSocket } from "./socket-provider";

type NotificationsContextValue = {
  items: NotificationDTO[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue>({
  items: [],
  unreadCount: 0,
  markRead: () => {},
  markAllRead: () => {},
});

export function useNotifications(): NotificationsContextValue {
  return useContext(NotificationsContext);
}

/**
 * Estado global de notificações — carrega a lista inicial via REST e escuta
 * `notification:new` no socket compartilhado (room pessoal `user:<id>`, ver
 * server/notification-dispatcher.ts). Monta na raiz (app)/layout.tsx, então
 * funciona tanto dentro de um workspace quanto na lista de workspaces.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    notificationsClient.fetch().then((data) => {
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onNew = (dto: NotificationDTO) => {
      setItems((prev) => [dto, ...prev]);
      setUnreadCount((n) => n + 1);
      toast(dto.title, { description: dto.body ?? undefined });
    };

    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [socket]);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((n) => Math.max(0, n - 1));
    void notificationsClient.markRead(id);
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    void notificationsClient.markAllRead();
  }, []);

  return (
    <NotificationsContext.Provider value={{ items, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}
