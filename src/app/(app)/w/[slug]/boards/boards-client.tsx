"use client";

import { useSocket } from "@/components/providers/socket-provider";
import { useWorkspaceDock } from "@/components/shell/workspace-dock-provider";
import { kanbanClient } from "@/modules/kanban/client";
import { KanbanBoard } from "@/modules/kanban/components/kanban-board";
import type { BoardData } from "@/modules/kanban/types";

export function BoardsClient({ initial, currentUserId }: { initial: BoardData; currentUserId: string }) {
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
