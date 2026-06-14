"use client";

import { useCallback, useState } from "react";
import { Hash } from "lucide-react";
import type { Socket } from "socket.io-client";
import type {
  ChannelDTO,
  ChatCreateChannel,
  ChatData,
  ChatFetchMessages,
  ChatSendMessage,
  MessageDTO,
} from "../types";
import { useChatRealtime } from "../hooks/use-chat-realtime";
import { ChatProvider } from "./chat-context";
import { ChannelSidebar } from "./channel-sidebar";
import { MessageList } from "./message-list";
import { MessageComposer } from "./message-composer";

export function ChatPanel({
  initial,
  currentUserId,
  onlineUserIds,
  socket,
  send,
  createChannel,
  fetchMessages,
}: {
  initial: ChatData;
  currentUserId: string;
  onlineUserIds: string[];
  socket: Socket | null;
  send: ChatSendMessage;
  createChannel: ChatCreateChannel;
  fetchMessages: ChatFetchMessages;
}) {
  const [channels, setChannels] = useState<ChannelDTO[]>(initial.channels);
  const [activeId, setActiveId] = useState<string | null>(initial.initialChannelId);
  const [messages, setMessages] = useState<MessageDTO[]>(initial.initialMessages);
  const [unread, setUnread] = useState<Set<string>>(new Set());

  const loadMessages = useCallback(
    async (channelId: string) => {
      const msgs = await fetchMessages(channelId);
      setMessages(msgs);
    },
    [fetchMessages],
  );

  const selectChannel = useCallback(
    (channelId: string) => {
      setActiveId(channelId);
      setUnread((prev) => {
        if (!prev.has(channelId)) return prev;
        const next = new Set(prev);
        next.delete(channelId);
        return next;
      });
      void loadMessages(channelId);
    },
    [loadMessages],
  );

  const onRealtime = useCallback(
    (channelId: string, fromSelf: boolean) => {
      if (fromSelf) return;
      if (channelId === activeId) {
        void loadMessages(channelId);
      } else {
        setUnread((prev) => new Set(prev).add(channelId));
      }
    },
    [activeId, loadMessages],
  );

  useChatRealtime(socket, currentUserId, onRealtime);

  const handleSend = async (content: string) => {
    if (!activeId) return;
    const res = await send({ channelId: activeId, content });
    if (res.ok) setMessages((prev) => [...prev, res.data]);
  };

  const handleChannelCreated = (channel: ChannelDTO) => {
    setChannels((prev) => [...prev, channel]);
    selectChannel(channel.id);
  };

  const activeChannel = channels.find((c) => c.id === activeId) ?? null;

  return (
    <ChatProvider
      value={{
        send,
        createChannel,
        fetchMessages,
        currentUserId,
        members: initial.members,
        onlineUserIds,
      }}
    >
      <div className="flex h-full">
        <ChannelSidebar
          channels={channels}
          activeId={activeId}
          unread={unread}
          projectId={initial.projectId}
          onSelect={selectChannel}
          onChannelCreated={handleChannelCreated}
        />
        <div className="flex flex-1 flex-col">
          {activeChannel ? (
            <>
              <div className="flex items-center gap-1.5 border-b px-4 py-3 font-semibold">
                <Hash className="h-4 w-4 text-muted-foreground" />
                {activeChannel.name}
              </div>
              <MessageList messages={messages} />
              <MessageComposer onSend={handleSend} />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Nenhum canal disponível.
            </div>
          )}
        </div>
      </div>
    </ChatProvider>
  );
}
