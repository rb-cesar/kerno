"use client";

import { KanbanBoard, type BoardData } from "@kerno/kanban";
import { useSocket } from "@/components/providers/socket-provider";
import { kanbanFetch, kanbanFetchCardDetail, kanbanFetchMetrics, kanbanMutate } from "./actions";

export function BoardsClient({
  initial,
  currentUserId,
}: {
  initial: BoardData;
  currentUserId: string;
}) {
  const { socket } = useSocket();

  return (
    <KanbanBoard
      initial={initial}
      currentUserId={currentUserId}
      socket={socket}
      mutate={kanbanMutate}
      fetchSnapshot={kanbanFetch}
      fetchCardDetail={kanbanFetchCardDetail}
      fetchMetrics={kanbanFetchMetrics}
    />
  );
}
