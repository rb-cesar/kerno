"use client";

import { ChatPanel, type ChatData } from "@kerno/chat";
import { useSocket } from "@/components/providers/socket-provider";
import {
  chatCreateChannel,
  chatEditMessage,
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
      editMessage={chatEditMessage}
      createChannel={chatCreateChannel}
      fetchMessages={chatFetchMessages}
      openDirect={chatOpenDirect}
      sendDirect={chatSendDirectMessage}
      fetchDirectMessages={chatFetchDirectMessages}
      toggleReaction={chatToggleReaction}
    />
  );
}
