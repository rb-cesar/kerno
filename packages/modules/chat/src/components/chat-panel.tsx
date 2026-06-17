"use client";

import { useCallback, useMemo, useState } from "react";
import { AtSign, Hash } from "lucide-react";
import type { Socket } from "socket.io-client";
import { cn } from "@kerno/ui";
import type {
  ChannelDTO,
  ChatCreateChannel,
  ChatData,
  ChatFetchDirectMessages,
  ChatFetchMessages,
  ChatOpenDirect,
  ChatSendDirectMessage,
  ChatSendMessage,
  DirectConversationDTO,
  MessageDTO,
} from "../types";
import { useChatRealtime, type ChatTarget } from "../hooks/use-chat-realtime";
import { ChatProvider } from "./chat-context";
import { ChannelSidebar } from "./channel-sidebar";
import { MessageList } from "./message-list";
import { MessageComposer } from "./message-composer";

/** O que está aberto no painel principal: um canal ou uma conversa privada. */
type ActiveTarget = { kind: "channel"; id: string } | { kind: "dm"; id: string };

function sameTarget(a: ActiveTarget | null, b: ActiveTarget): boolean {
  return a !== null && a.kind === b.kind && a.id === b.id;
}

export function ChatPanel({
  initial,
  currentUserId,
  onlineUserIds,
  socket,
  send,
  createChannel,
  fetchMessages,
  openDirect,
  sendDirect,
  fetchDirectMessages,
}: {
  initial: ChatData;
  currentUserId: string;
  onlineUserIds: string[];
  socket: Socket | null;
  send: ChatSendMessage;
  createChannel: ChatCreateChannel;
  fetchMessages: ChatFetchMessages;
  openDirect: ChatOpenDirect;
  sendDirect: ChatSendDirectMessage;
  fetchDirectMessages: ChatFetchDirectMessages;
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
    (target: ChatTarget, fromSelf: boolean) => {
      if (fromSelf) return;

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
    const res =
      active.kind === "channel"
        ? await send({ channelId: active.id, content })
        : await sendDirect({ conversationId: active.id, content });
    if (res.ok) setMessages((prev) => [...prev, res.data]);
  };

  const handleChannelCreated = (channel: ChannelDTO) => {
    setChannels((prev) => [...prev, channel]);
    select({ kind: "channel", id: channel.id });
  };

  const handleStartDirect = async (userId: string) => {
    const res = await openDirect({ projectId: initial.projectId, userId });
    if (!res.ok) return;
    setConversations((prev) =>
      prev.some((c) => c.id === res.data.id) ? prev : [res.data, ...prev],
    );
    select({ kind: "dm", id: res.data.id });
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
      }}
    >
      <div className="flex h-full">
        <ChannelSidebar
          channels={channels}
          conversations={conversations}
          activeId={active?.id ?? null}
          unread={unread}
          projectId={initial.projectId}
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
              <MessageList messages={messages} />
              <MessageComposer
                onSend={handleSend}
                placeholder={`Mensagem em #${activeChannel.name}`}
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
              <MessageList messages={messages} />
              <MessageComposer
                onSend={handleSend}
                placeholder={`Mensagem para ${activeConversation.participants[0]?.name ?? "membro"}`}
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
