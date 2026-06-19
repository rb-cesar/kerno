"use client";

import { useEffect, useRef, useState } from "react";
import { CornerUpLeft, Pencil, SmilePlus } from "lucide-react";
import { cn } from "@kerno/ui";
import type { ChatResult, MessageDTO } from "../types";
import { useChat } from "./chat-context";
import { MessageContent } from "./message-content";
import { MessageComposer } from "./message-composer";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "👀", "✅", "🙏", "🔥"];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatFull(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
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
  editingId,
  onEditingChange,
  onReply,
  onEdit,
  onToggleReaction,
}: {
  messages: MessageDTO[];
  editingId: string | null;
  onEditingChange: (id: string | null) => void;
  onReply: (message: MessageDTO) => void;
  onEdit: (messageId: string, content: string) => Promise<ChatResult<MessageDTO>>;
  onToggleReaction: (messageId: string, emoji: string) => void;
}) {
  const { currentUserId } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  // Mapa id→elemento da bolha, para rolar até a mensagem citada ao clicar na resposta.
  const bubbleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [reactOpenFor, setReactOpenFor] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    // Não rola para o fim enquanto se edita uma mensagem antiga.
    if (editingId) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, editingId]);

  const scrollToMessage = (id: string) => {
    const el = bubbleRefs.current.get(id);
    if (!el) return; // mensagem fora do trecho carregado — ignora por ora
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedId(id);
    window.setTimeout(() => setHighlightedId((cur) => (cur === id ? null : cur)), 1600);
  };

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
        const isEditing = editingId === message.id;

        return (
          <div key={message.id} className={cn("group flex gap-2", isOwn && "flex-row-reverse")}>
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
              {initials(message.author?.name ?? "?")}
            </span>

            <div className={cn("flex min-w-0 max-w-[80%] flex-col", isOwn && "items-end")}>
              {message.replyTo ? (
                <button
                  type="button"
                  onClick={() => message.replyTo && scrollToMessage(message.replyTo.id)}
                  title="Ir para a mensagem"
                  className={cn(
                    "mb-0.5 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
                    isOwn && "flex-row-reverse",
                  )}
                >
                  <CornerUpLeft className="h-3 w-3 shrink-0" />
                  <span className="font-medium">{message.replyTo.authorName}</span>
                  <span className="max-w-[16rem] truncate opacity-80">
                    {message.replyTo.excerpt}
                  </span>
                </button>
              ) : null}

              <div className={cn("flex items-baseline gap-2", isOwn && "flex-row-reverse")}>
                <span className="text-sm font-medium">
                  {message.author?.name ?? "Desconhecido"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(message.createdAt)}
                </span>
                {message.editedAt ? (
                  <span
                    className="text-[11px] text-muted-foreground"
                    title={`Editada em ${formatFull(message.editedAt)}`}
                  >
                    (editado)
                  </span>
                ) : null}
                {isEditing ? null : (
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
                    {isOwn ? (
                      <button
                        type="button"
                        onClick={() => {
                          onEditingChange(message.id);
                          setReactOpenFor(null);
                        }}
                        title="Editar"
                        className="hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    ) : null}
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
                )}
              </div>

              {isEditing ? (
                <div className="mt-0.5 w-full min-w-[16rem]">
                  <MessageComposer
                    initialMarkdown={message.content}
                    onCancel={() => onEditingChange(null)}
                    onSend={async (content) => {
                      const res = await onEdit(message.id, content);
                      if (res.ok) onEditingChange(null);
                    }}
                  />
                </div>
              ) : (
                <div
                  ref={(el) => {
                    if (el) bubbleRefs.current.set(message.id, el);
                    else bubbleRefs.current.delete(message.id);
                  }}
                  className={cn(
                    "mt-0.5 rounded-2xl px-3 py-2 transition-shadow duration-700",
                    isOwn ? "bg-sky-600/20" : "bg-muted/60",
                    highlightedId === message.id && "ring-2 ring-sky-400/80",
                  )}
                >
                  <MessageContent content={message.content} />
                </div>
              )}

              {message.reactions.length > 0 && !isEditing ? (
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
