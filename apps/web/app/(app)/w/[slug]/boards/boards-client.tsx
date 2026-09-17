"use client";

import { type BoardData, KanbanBoard, kanbanClient } from "@kerno/kanban";
import { useSocket } from "@/components/providers/socket-provider";
import { useWorkspaceDock } from "@/components/providers/workspace-dock-provider";

export function BoardsClient({
  initial,
  currentUserId,
}: {
  initial: BoardData;
  currentUserId: string;
}) {
  const { socket } = useSocket();
  const { openCard, activeCardId } = useWorkspaceDock();

  return (
    <KanbanBoard
      initial={initial}
      currentUserId={currentUserId}
      socket={socket}
      mutate={kanbanClient.command}
      fetchSnapshot={kanbanClient.snapshot}
      fetchCardDetail={kanbanClient.cardDetail}
      fetchMetrics={kanbanClient.metrics}
      onOpenCard={openCard}
      activeCardId={activeCardId}
    />
  );
}
