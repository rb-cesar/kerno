"use client";

import { ChatPanel, type ChatData } from "@kerno/chat";
import { useSocket } from "@/components/providers/socket-provider";
import {
  chatCreateChannel,
  chatFetchDirectMessages,
  chatFetchMessages,
  chatOpenDirect,
  chatSendDirectMessage,
  chatSendMessage,
  chatToggleReaction,
} from "./actions";

export function ChatClient({
  initial,
  currentUserId,
}: {
  initial: ChatData;
  currentUserId: string;
}) {
  const { socket, onlineUserIds } = useSocket();

  return (
    <ChatPanel
      initial={initial}
      currentUserId={currentUserId}
      onlineUserIds={onlineUserIds}
      socket={socket}
      send={chatSendMessage}
      createChannel={chatCreateChannel}
      fetchMessages={chatFetchMessages}
      openDirect={chatOpenDirect}
      sendDirect={chatSendDirectMessage}
      fetchDirectMessages={chatFetchDirectMessages}
      toggleReaction={chatToggleReaction}
    />
  );
}
