"use client";

import { useEffect, useRef } from "react";
import { cn } from "@kerno/ui";
import type { MessageDTO } from "../types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MessageList({ messages }: { messages: MessageDTO[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Nenhuma mensagem ainda. Diga olá 👋
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((message) =>
        message.isSystem ? (
          <div key={message.id} className="text-center text-xs italic text-muted-foreground">
            {message.content}
          </div>
        ) : (
          <div key={message.id} className="flex gap-2">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
              {initials(message.author?.name ?? "?")}
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{message.author?.name ?? "Desconhecido"}</span>
                <span className="text-xs text-muted-foreground">{formatTime(message.createdAt)}</span>
              </div>
              <div className={cn("whitespace-pre-wrap break-words text-sm")}>{message.content}</div>
            </div>
          </div>
        ),
      )}
      <div ref={bottomRef} />
    </div>
  );
}
