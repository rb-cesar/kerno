"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { notificationsClient } from "@/modules/notifications/client";
import type { NotificationDTO } from "@/modules/notifications/types";
import { useSocket } from "./socket-provider";

type NotificationsContextValue = {
  items: NotificationDTO[];
  unreadCount: number;
  hasMore: boolean;
  loadingMore: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  loadMore: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue>({
  items: [],
  unreadCount: 0,
  hasMore: false,
  loadingMore: false,
  markRead: () => {},
  markAllRead: () => {},
  loadMore: () => {},
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
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    notificationsClient.fetch().then((data) => {
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      setHasMore(data.hasMore);
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

  const loadMore = useCallback(() => {
    const oldestId = items.at(-1)?.id;
    if (!oldestId) return;
    setLoadingMore(true);
    notificationsClient
      .fetch(oldestId)
      .then((data) => {
        setItems((cur) => [...cur, ...data.items]);
        setHasMore(data.hasMore);
      })
      .finally(() => setLoadingMore(false));
  }, [items]);

  return (
    <NotificationsContext.Provider
      value={{ items, unreadCount, hasMore, loadingMore, markRead, markAllRead, loadMore }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
