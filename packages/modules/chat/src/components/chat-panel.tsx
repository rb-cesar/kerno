"use client";

import { useCallback, useMemo, useState } from "react";
import { AtSign, CornerUpLeft, Hash, X } from "lucide-react";
import type { Socket } from "socket.io-client";
import { cn } from "@kerno/ui";
import type {
  ChannelDTO,
  ChatCreateChannel,
  ChatData,
  ChatEditMessage,
  ChatFetchDirectMessages,
  ChatFetchMessages,
  ChatOpenDirect,
  ChatResult,
  ChatSearchTasks,
  ChatSendDirectMessage,
  ChatSendMessage,
  ChatToggleReaction,
  DirectConversationDTO,
  MessageDTO,
} from "../types";
import {
  useChatRealtime,
  type ChatEventKind,
  type ChatTarget,
} from "../hooks/use-chat-realtime";
import { ChatProvider } from "./chat-context";
import { ChannelSidebar } from "./channel-sidebar";
import { MessageList } from "./message-list";
import { MessageComposer } from "./message-composer";

/** O que está aberto no painel principal: um canal ou uma conversa privada. */
type ActiveTarget = { kind: "channel"; id: string } | { kind: "dm"; id: string };

function sameTarget(a: ActiveTarget | null, b: ActiveTarget): boolean {
  return a !== null && a.kind === b.kind && a.id === b.id;
}

/** Faixa "respondendo a X", mostrada acima do composer. */
function ReplyBanner({ reply, onCancel }: { reply: MessageDTO; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2 border-t bg-muted/40 px-3 py-1.5 text-xs">
      <CornerUpLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">Respondendo a</span>
      <span className="font-medium">{reply.author?.name ?? "Desconhecido"}</span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">
        {reply.content.replace(/\s+/g, " ").trim()}
      </span>
      <button
        type="button"
        onClick={onCancel}
        title="Cancelar resposta"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ChatPanel({
  initial,
  currentUserId,
  onlineUserIds,
  socket,
  send,
  editMessage,
  createChannel,
  fetchMessages,
  openDirect,
  sendDirect,
  fetchDirectMessages,
  toggleReaction,
  searchTasks,
  onOpenTask,
}: {
  initial: ChatData;
  currentUserId: string;
  onlineUserIds: string[];
  socket: Socket | null;
  send: ChatSendMessage;
  editMessage: ChatEditMessage;
  createChannel: ChatCreateChannel;
  fetchMessages: ChatFetchMessages;
  openDirect: ChatOpenDirect;
  sendDirect: ChatSendDirectMessage;
  fetchDirectMessages: ChatFetchDirectMessages;
  toggleReaction: ChatToggleReaction;
  /** Busca tarefas p/ a menção `!` (opcional). */
  searchTasks?: ChatSearchTasks;
  /** Abre o painel de uma tarefa mencionada (opcional). `label` = KERN-N p/ a aba. */
  onOpenTask?: (cardId: string, label?: string) => void;
}) {
  const [channels, setChannels] = useState<ChannelDTO[]>(initial.channels);
  const [conversations, setConversations] = useState<DirectConversationDTO[]>(
    initial.conversations,
  );
  const [active, setActive] = useState<ActiveTarget | null>(
    initial.initialChannelId ? { kind: "channel", id: initial.initialChannelId } : null,
  );
  const [messages, setMessages] = useState<MessageDTO[]>(initial.initialMessages);
  const [unread, setUnread] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<MessageDTO | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadMessages = useCallback(
    async (target: ActiveTarget) => {
      const msgs =
        target.kind === "channel"
          ? await fetchMessages(target.id)
          : await fetchDirectMessages(target.id);
      setMessages(msgs);
    },
    [fetchMessages, fetchDirectMessages],
  );

  const select = useCallback(
    (target: ActiveTarget) => {
      setActive(target);
      setReplyTo(null);
      setEditingId(null);
      setUnread((prev) => {
        if (!prev.has(target.id)) return prev;
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
      void loadMessages(target);
    },
    [loadMessages],
  );

  const memberById = useMemo(
    () => new Map(initial.members.map((m) => [m.id, m])),
    [initial.members],
  );

  const onRealtime = useCallback(
    (target: ChatTarget, fromSelf: boolean, kind: ChatEventKind) => {
      if (fromSelf) return;

      // Reação/edição: só atualiza se for o alvo aberto (nunca marca como não-lida).
      if (kind === "reaction" || kind === "edit") {
        const asActive: ActiveTarget = { kind: target.kind, id: target.id };
        if (sameTarget(active, asActive)) void loadMessages(asActive);
        return;
      }

      // DM de uma conversa que ainda não está na lista (criada pelo outro lado):
      // monta o DTO a partir dos membros conhecidos e adiciona à sidebar.
      if (target.kind === "dm") {
        setConversations((prev) => {
          if (prev.some((c) => c.id === target.id)) return prev;
          const others = target.participantIds
            .filter((id) => id !== currentUserId)
            .map((id) => memberById.get(id))
            .filter((m): m is NonNullable<typeof m> => Boolean(m));
          return [
            { id: target.id, participants: others, lastMessageAt: new Date().toISOString() },
            ...prev,
          ];
        });
      }

      const asActive: ActiveTarget = { kind: target.kind, id: target.id };
      if (sameTarget(active, asActive)) {
        void loadMessages(asActive);
      } else {
        setUnread((prev) => new Set(prev).add(target.id));
      }
    },
    [active, loadMessages, currentUserId, memberById],
  );

  useChatRealtime(socket, currentUserId, onRealtime);

  const handleSend = async (content: string) => {
    if (!active) return;
    const replyToId = replyTo?.id ?? null;
    const res =
      active.kind === "channel"
        ? await send({ channelId: active.id, content, replyToId })
        : await sendDirect({ conversationId: active.id, content, replyToId });
    if (res.ok) {
      setMessages((prev) => [...prev, res.data]);
      setReplyTo(null);
    }
  };

  const handleEdit = async (
    messageId: string,
    content: string,
  ): Promise<ChatResult<MessageDTO>> => {
    const res = await editMessage({ messageId, content });
    if (res.ok) {
      setMessages((prev) => prev.map((m) => (m.id === res.data.id ? res.data : m)));
    }
    return res;
  };

  // ↑ no campo vazio: edita a última mensagem própria do alvo aberto.
  const handleEditLast = useCallback(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m && !m.isSystem && m.author?.id === currentUserId) {
        setEditingId(m.id);
        return;
      }
    }
  }, [messages, currentUserId]);

  const handleChannelCreated = (channel: ChannelDTO) => {
    setChannels((prev) => [...prev, channel]);
    select({ kind: "channel", id: channel.id });
  };

  const handleStartDirect = async (userId: string) => {
    const res = await openDirect({ workspaceId: initial.workspaceId, userId });
    if (!res.ok) return;
    setConversations((prev) =>
      prev.some((c) => c.id === res.data.id) ? prev : [res.data, ...prev],
    );
    select({ kind: "dm", id: res.data.id });
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    const res = await toggleReaction({ messageId, emoji });
    if (res.ok && active) void loadMessages(active);
  };

  const activeChannel =
    active?.kind === "channel" ? channels.find((c) => c.id === active.id) ?? null : null;
  const activeConversation =
    active?.kind === "dm" ? conversations.find((c) => c.id === active.id) ?? null : null;

  return (
    <ChatProvider
      value={{
        send,
        createChannel,
        fetchMessages,
        openDirect,
        sendDirect,
        fetchDirectMessages,
        currentUserId,
        members: initial.members,
        onlineUserIds,
        searchTasks,
        onOpenTask,
      }}
    >
      <div className="flex h-full">
        <ChannelSidebar
          channels={channels}
          conversations={conversations}
          activeId={active?.id ?? null}
          unread={unread}
          workspaceId={initial.workspaceId}
          onSelectChannel={(id) => select({ kind: "channel", id })}
          onSelectConversation={(id) => select({ kind: "dm", id })}
          onChannelCreated={handleChannelCreated}
          onStartDirect={handleStartDirect}
        />
        <div className="flex flex-1 flex-col">
          {activeChannel ? (
            <>
              <div className="flex items-center gap-1.5 border-b px-4 py-3 font-semibold">
                <Hash className="h-4 w-4 text-muted-foreground" />
                {activeChannel.name}
              </div>
              <MessageList
                messages={messages}
                editingId={editingId}
                onEditingChange={setEditingId}
                onReply={setReplyTo}
                onEdit={handleEdit}
                onToggleReaction={handleToggleReaction}
              />
              {replyTo ? <ReplyBanner reply={replyTo} onCancel={() => setReplyTo(null)} /> : null}
              <MessageComposer
                onSend={handleSend}
                placeholder={`Mensagem em #${activeChannel.name}`}
                draftKey={`${initial.workspaceId}:channel:${activeChannel.id}`}
                onRequestEditLast={handleEditLast}
              />
            </>
          ) : activeConversation ? (
            <>
              <div className="flex items-center gap-2 border-b px-4 py-3 font-semibold">
                <AtSign className="h-4 w-4 text-muted-foreground" />
                {activeConversation.participants.map((p) => p.name).join(", ") || "Conversa"}
                {activeConversation.participants.some((p) => onlineUserIds.includes(p.id)) ? (
                  <span className="h-2 w-2 rounded-full bg-emerald-500" title="Online" />
                ) : null}
              </div>
              <MessageList
                messages={messages}
                editingId={editingId}
                onEditingChange={setEditingId}
                onReply={setReplyTo}
                onEdit={handleEdit}
                onToggleReaction={handleToggleReaction}
              />
              {replyTo ? <ReplyBanner reply={replyTo} onCancel={() => setReplyTo(null)} /> : null}
              <MessageComposer
                onSend={handleSend}
                placeholder={`Mensagem para ${activeConversation.participants[0]?.name ?? "membro"}`}
                draftKey={`${initial.workspaceId}:dm:${activeConversation.id}`}
                onRequestEditLast={handleEditLast}
              />
            </>
          ) : (
            <div
              className={cn(
                "flex flex-1 items-center justify-center text-sm text-muted-foreground",
              )}
            >
              Selecione um canal ou inicie uma conversa.
            </div>
          )}
        </div>
      </div>
    </ChatProvider>
  );
}
