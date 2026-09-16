"use client";

import { useCallback } from "react";
import { ChatPanel, type ChatData } from "@kerno/chat";
import { useSocket } from "@/components/providers/socket-provider";
import { useWorkspaceDock } from "@/components/providers/workspace-dock-provider";
import { kanbanSearchTasks } from "@/lib/kanban-actions";
import {
  chatCreateChannel,
  chatEditMessage,
  chatFetchDirectMessages,
  chatFetchMessages,
  chatOpenDirect,
  chatSendDirectMessage,
  chatSendMessage,
  chatToggleReaction,
} from "@/lib/chat-actions";

export function ChatClient({
  initial,
  currentUserId,
}: {
  initial: ChatData;
  currentUserId: string;
}) {
  const { socket, onlineUserIds } = useSocket();
  const { openCard } = useWorkspaceDock();

  // Liga a menção `!` à API do kanban (busca por workspace).
  const searchTasks = useCallback(
    (query: string) => kanbanSearchTasks(initial.workspaceId, query),
    [initial.workspaceId],
  );

  // Clicar no chip de tarefa abre no dock compartilhado do workspace.
  const onOpenTask = useCallback(
    (cardId: string, label?: string) => openCard(cardId, { title: label }),
    [openCard],
  );

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
      searchTasks={searchTasks}
      onOpenTask={onOpenTask}
    />
  );
}
