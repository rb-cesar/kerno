"use client";

import { type ChatData, ChatPanel, chatClient } from "@kerno/chat";
import { kanbanClient } from "@kerno/kanban";
import { useCallback } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useWorkspaceDock } from "@/components/providers/workspace-dock-provider";

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
    (query: string) => kanbanClient.searchTasks(initial.workspaceId, query),
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
      send={chatClient.sendMessage}
      editMessage={chatClient.editMessage}
      createChannel={chatClient.createChannel}
      fetchMessages={chatClient.fetchMessages}
      openDirect={chatClient.openDirect}
      sendDirect={chatClient.sendDirectMessage}
      fetchDirectMessages={chatClient.fetchDirectMessages}
      toggleReaction={chatClient.toggleReaction}
      searchTasks={searchTasks}
      onOpenTask={onOpenTask}
    />
  );
}
