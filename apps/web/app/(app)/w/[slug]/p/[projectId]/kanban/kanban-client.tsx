"use client";

import { KanbanBoard, type BoardData } from "@kerno/kanban";
import { useSocket } from "@/components/providers/socket-provider";
import { kanbanFetch, kanbanMutate } from "./actions";

export function KanbanClient({
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
    />
  );
}
