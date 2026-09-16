"use client";

import { KanbanBoard, type BoardData } from "@kerno/kanban";
import { useSocket } from "@/components/providers/socket-provider";
import { useWorkspaceDock } from "@/components/providers/workspace-dock-provider";
import {
  kanbanFetch,
  kanbanFetchCardDetail,
  kanbanFetchMetrics,
  kanbanMutate,
} from "@/lib/kanban-actions";

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
      mutate={kanbanMutate}
      fetchSnapshot={kanbanFetch}
      fetchCardDetail={kanbanFetchCardDetail}
      fetchMetrics={kanbanFetchMetrics}
      onOpenCard={openCard}
      activeCardId={activeCardId}
    />
  );
}
