"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useNotifications } from "@/components/providers/notifications-provider";
import { Badge, Button, cn, Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui";
import type { NotificationDTO } from "@/modules/notifications/types";

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function NotificationRow({ notification, onRead }: { notification: NotificationDTO; onRead: () => void }) {
  const content = (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-md px-3 py-2 text-sm hover:bg-accent",
        !notification.read && "bg-accent/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{notification.title}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</span>
      </div>
      {notification.body ? <span className="text-muted-foreground">{notification.body}</span> : null}
    </div>
  );

  if (!notification.link) return content;

  return (
    <PopoverClose asChild>
      <Link href={notification.link} onClick={onRead}>
        {content}
      </Link>
    </PopoverClose>
  );
}

/** Sino com contagem de não-lidas — usado no HubRail (dentro de um workspace) e no AppTopbar. */
export function NotificationBell({
  side = "bottom",
  align = "end",
}: {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
  const { items, unreadCount, hasMore, loadingMore, markRead, markAllRead, loadMore } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Notificações"
          aria-label="Notificações"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-current/70 hover:bg-accent"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center bg-primary px-1 text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className="w-80 p-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-sm font-semibold">Notificações</span>
          {unreadCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs">
              Marcar todas como lidas
            </Button>
          ) : null}
        </div>
        <div className="flex max-h-96 flex-col gap-0.5 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
          ) : (
            items.map((n) => <NotificationRow key={n.id} notification={n} onRead={() => !n.read && markRead(n.id)} />)
          )}
          {hasMore ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-1 w-full text-xs text-muted-foreground"
            >
              {loadingMore ? "Carregando…" : "Carregar mais"}
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
