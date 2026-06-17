"use client";

import { useEffect, useRef } from "react";
import { CornerUpLeft } from "lucide-react";
import { cn } from "@kerno/ui";
import type { MessageDTO } from "../types";
import { useChat } from "./chat-context";
import { MessageContent } from "./message-content";

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

export function MessageList({
  messages,
  onReply,
}: {
  messages: MessageDTO[];
  onReply: (message: MessageDTO) => void;
}) {
  const { currentUserId } = useChat();
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
      {messages.map((message) => {
        if (message.isSystem) {
          return (
            <div key={message.id} className="text-center text-xs italic text-muted-foreground">
              {message.content}
            </div>
          );
        }

        const isOwn = message.author?.id === currentUserId;

        return (
          <div key={message.id} className={cn("group flex gap-2", isOwn && "flex-row-reverse")}>
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
              {initials(message.author?.name ?? "?")}
            </span>

            <div className={cn("flex min-w-0 max-w-[80%] flex-col", isOwn && "items-end")}>
              {message.replyTo ? (
                <div
                  className={cn(
                    "mb-0.5 flex items-center gap-1 text-xs text-muted-foreground",
                    isOwn && "flex-row-reverse",
                  )}
                >
                  <CornerUpLeft className="h-3 w-3 shrink-0" />
                  <span className="font-medium">{message.replyTo.authorName}</span>
                  <span className="max-w-[16rem] truncate opacity-80">
                    {message.replyTo.excerpt}
                  </span>
                </div>
              ) : null}

              <div className={cn("flex items-baseline gap-2", isOwn && "flex-row-reverse")}>
                <span className="text-sm font-medium">
                  {message.author?.name ?? "Desconhecido"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(message.createdAt)}
                </span>
                <button
                  type="button"
                  onClick={() => onReply(message)}
                  title="Responder"
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                >
                  <CornerUpLeft className="h-3 w-3" />
                </button>
              </div>

              <div
                className={cn(
                  "mt-0.5 rounded-2xl px-3 py-2",
                  isOwn ? "bg-sky-600/20" : "bg-muted/60",
                )}
              >
                <MessageContent content={message.content} />
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
