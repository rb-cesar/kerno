"use client";

import { useState, useTransition } from "react";
import { Hash, Plus } from "lucide-react";
import { Input, cn } from "@kerno/ui";
import type { ChannelDTO } from "../types";
import { useChat } from "./chat-context";

export function ChannelSidebar({
  channels,
  activeId,
  unread,
  projectId,
  onSelect,
  onChannelCreated,
}: {
  channels: ChannelDTO[];
  activeId: string | null;
  unread: Set<string>;
  projectId: string;
  onSelect: (channelId: string) => void;
  onChannelCreated: (channel: ChannelDTO) => void;
}) {
  const { createChannel, members, onlineUserIds } = useChat();
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
      const res = await createChannel({ projectId, name: value });
      if (res.ok) {
        setName("");
        setAdding(false);
        onChannelCreated(res.data);
      }
    });
  };

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
              onClick={() => onSelect(channel.id)}
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
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Membros</div>
        <ul className="space-y-1.5">
          {members.map((m) => {
            const online = onlineUserIds.includes(m.id);
            return (
              <li key={m.id} className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    online ? "bg-emerald-500" : "bg-neutral-600",
                  )}
                />
                <span className={cn("truncate", !online && "text-muted-foreground")}>
                  {m.name}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
