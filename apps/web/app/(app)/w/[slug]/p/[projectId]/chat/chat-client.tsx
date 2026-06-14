"use client";

import { ChatPanel, type ChatData } from "@kerno/hub-chat";
import { useSocket } from "@/components/providers/socket-provider";
import { chatCreateChannel, chatFetchMessages, chatSendMessage } from "./actions";

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
    />
  );
}
