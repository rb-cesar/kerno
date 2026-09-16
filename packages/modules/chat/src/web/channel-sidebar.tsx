"use client";

import { useState, useTransition } from "react";
import { AtSign, Hash, Plus } from "lucide-react";
import { Input, cn } from "@kerno/ui";
import type { ChannelDTO, DirectConversationDTO } from "../types";
import { useChat } from "./chat-context";

export function ChannelSidebar({
  channels,
  conversations,
  activeId,
  unread,
  workspaceId,
  onSelectChannel,
  onSelectConversation,
  onChannelCreated,
  onStartDirect,
}: {
  channels: ChannelDTO[];
  conversations: DirectConversationDTO[];
  activeId: string | null;
  unread: Set<string>;
  workspaceId: string;
  onSelectChannel: (channelId: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onChannelCreated: (channel: ChannelDTO) => void;
  onStartDirect: (userId: string) => void;
}) {
  const { createChannel, currentUserId, members, onlineUserIds } = useChat();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const value = name.trim();
    if (!value) {
      setAdding(false);
      return;
    }
    startTransition(async () => {
      const res = await createChannel({ workspaceId, name: value });
      if (res.ok) {
        setName("");
        setAdding(false);
        onChannelCreated(res.data);
      }
    });
  };

  // Membros que ainda não têm uma conversa aberta (para a lista de "iniciar DM").
  const conversationUserIds = new Set(
    conversations.flatMap((c) => c.participants.map((p) => p.id)),
  );

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Canais</span>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-muted-foreground hover:text-foreground"
          title="Novo canal"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {channels.map((channel) => {
          const active = channel.id === activeId;
          return (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={cn(
                "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Hash className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate text-left">{channel.name}</span>
              {!active && unread.has(channel.id) ? (
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              ) : null}
            </button>
          );
        })}

        {adding ? (
          <Input
            autoFocus
            value={name}
            placeholder="nome-do-canal"
            disabled={pending}
            onChange={(e) => setName(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") setAdding(false);
            }}
            className="h-7"
          />
        ) : null}

        {conversations.length > 0 ? (
          <>
            <div className="px-2 pb-1 pt-3 text-xs font-semibold uppercase text-muted-foreground">
              Mensagens Diretas
            </div>
            {conversations.map((conv) => {
              const active = conv.id === activeId;
              const label = conv.participants.map((p) => p.name).join(", ") || "Conversa";
              const online = conv.participants.some((p) => onlineUserIds.includes(p.id));
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <span className="relative shrink-0">
                    <AtSign className="h-3.5 w-3.5" />
                    {online ? (
                      <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-background" />
                    ) : null}
                  </span>
                  <span className="flex-1 truncate text-left">{label}</span>
                  {!active && unread.has(conv.id) ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  ) : null}
                </button>
              );
            })}
          </>
        ) : null}
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Membros</div>
        <ul className="space-y-0.5">
          {members.map((m) => {
            const self = m.id === currentUserId;
            const online = onlineUserIds.includes(m.id);
            const existing = !self && conversationUserIds.has(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={self}
                  onClick={() => onStartDirect(m.id)}
                  title={self ? undefined : `Conversar com ${m.name}`}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors",
                    self
                      ? "cursor-default"
                      : "hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      online ? "bg-emerald-500" : "bg-neutral-600",
                    )}
                  />
                  <span className={cn("flex-1 truncate", !online && "text-muted-foreground")}>
                    {m.name}
                    {self ? " (você)" : ""}
                  </span>
                  {existing ? <AtSign className="h-3 w-3 shrink-0 text-muted-foreground" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
