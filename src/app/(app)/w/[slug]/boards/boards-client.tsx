"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useWorkspaceDock } from "@/components/shell/workspace-dock-provider";
import { kanbanClient } from "@/modules/kanban/client";
import { KanbanBoard } from "@/modules/kanban/components/kanban-board";
import type { BoardData } from "@/modules/kanban/types";

export function BoardsClient({ initial, currentUserId }: { initial: BoardData; currentUserId: string }) {
  const { socket } = useSocket();
  const { openCard, activeCardId } = useWorkspaceDock();
  const searchParams = useSearchParams();

  // Deep-link de notificação (?card=<id>): abre a tarefa fixada, uma vez na montagem.
  useEffect(() => {
    const cardId = searchParams.get("card");
    if (cardId) openCard(cardId, { pin: true });
  }, []);

  return (
    <KanbanBoard
      initial={initial}
      currentUserId={currentUserId}
      socket={socket}
      mutate={kanbanClient.command}
      fetchSnapshot={kanbanClient.snapshot}
      fetchCardDetail={kanbanClient.cardDetail}
      fetchMetrics={kanbanClient.metrics}
      fetchColumnCards={kanbanClient.columnCards}
      onOpenCard={openCard}
      activeCardId={activeCardId}
    />
  );
}
