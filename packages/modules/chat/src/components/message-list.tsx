"use client";

import { useEffect, useRef, useState } from "react";
import { CornerUpLeft, SmilePlus } from "lucide-react";
import { cn } from "@kerno/ui";
import type { MessageDTO } from "../types";
import { useChat } from "./chat-context";
import { MessageContent } from "./message-content";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "👀", "✅", "🙏", "🔥"];

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
  onToggleReaction,
}: {
  messages: MessageDTO[];
  onReply: (message: MessageDTO) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}) {
  const { currentUserId } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [reactOpenFor, setReactOpenFor] = useState<string | null>(null);

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
                <div
                  className={cn(
                    "relative flex items-center gap-1 text-muted-foreground transition-opacity",
                    reactOpenFor === message.id
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onReply(message)}
                    title="Responder"
                    className="hover:text-foreground"
                  >
                    <CornerUpLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setReactOpenFor((cur) => (cur === message.id ? null : message.id))
                    }
                    title="Reagir"
                    className="hover:text-foreground"
                  >
                    <SmilePlus className="h-3 w-3" />
                  </button>
                  {reactOpenFor === message.id ? (
                    <div
                      className={cn(
                        "absolute top-5 z-10 flex gap-0.5 rounded-md border bg-popover p-1 shadow-md",
                        isOwn ? "right-0" : "left-0",
                      )}
                    >
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            onToggleReaction(message.id, emoji);
                            setReactOpenFor(null);
                          }}
                          className="rounded p-1 text-base leading-none hover:bg-accent"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                className={cn(
                  "mt-0.5 rounded-2xl px-3 py-2",
                  isOwn ? "bg-sky-600/20" : "bg-muted/60",
                )}
              >
                <MessageContent content={message.content} />
              </div>

              {message.reactions.length > 0 ? (
                <div className={cn("mt-1 flex flex-wrap gap-1", isOwn && "justify-end")}>
                  {message.reactions.map((reaction) => (
                    <button
                      key={reaction.emoji}
                      type="button"
                      onClick={() => onToggleReaction(message.id, reaction.emoji)}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors",
                        reaction.mine
                          ? "border-sky-500/60 bg-sky-600/20"
                          : "border-border bg-muted/40 hover:bg-muted",
                      )}
                    >
                      <span>{reaction.emoji}</span>
                      <span className="text-muted-foreground">{reaction.count}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
