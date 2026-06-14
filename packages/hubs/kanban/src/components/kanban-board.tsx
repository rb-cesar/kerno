"use client";

import { useCallback, useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import type { Socket } from "socket.io-client";
import type { BoardData, KanbanFetch, KanbanMutate } from "../types";
import { useKanbanRealtime } from "../hooks/use-kanban-realtime";
import { KanbanProvider } from "./kanban-context";
import { KanbanColumn } from "./kanban-column";
import { AddColumn } from "./add-column";
import { LabelManager } from "./label-manager";

export function KanbanBoard({
  initial,
  currentUserId,
  socket,
  mutate,
  fetchSnapshot,
}: {
  initial: BoardData;
  currentUserId: string;
  socket: Socket | null;
  mutate: KanbanMutate;
  fetchSnapshot: KanbanFetch;
}) {
  const [data, setData] = useState<BoardData>(initial);

  const refresh = useCallback(async () => {
    const fresh = await fetchSnapshot(initial.id);
    if (fresh) setData(fresh);
  }, [fetchSnapshot, initial.id]);

  useKanbanRealtime(socket, currentUserId, refresh);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const next = structuredClone(data) as BoardData;
    const sourceColumn = next.columns.find((c) => c.id === source.droppableId);
    const destColumn = next.columns.find((c) => c.id === destination.droppableId);
    if (!sourceColumn || !destColumn) return;

    const [moved] = sourceColumn.cards.splice(source.index, 1);
    if (!moved) return;
    moved.columnId = destColumn.id;
    destColumn.cards.splice(destination.index, 0, moved);

    setData(next);

    const sameColumn = source.droppableId === destination.droppableId;
    const res = await mutate({
      type: "moveCard",
      cardId: draggableId,
      fromColumnId: source.droppableId,
      toColumnId: destination.droppableId,
      destCardIds: destColumn.cards.map((c) => c.id),
      sourceCardIds: sameColumn ? [] : sourceColumn.cards.map((c) => c.id),
    });

    if (!res.ok) await refresh();
  };

  return (
    <KanbanProvider
      value={{
        mutate,
        refresh,
        currentUserId,
        members: data.members,
        labels: data.labels,
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-end px-4 py-2">
          <LabelManager boardId={data.id} />
        </div>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex flex-1 gap-4 overflow-x-auto px-4 pb-4">
            {data.columns.map((column) => (
              <KanbanColumn key={column.id} column={column} />
            ))}
            <AddColumn boardId={data.id} />
          </div>
        </DragDropContext>
      </div>
    </KanbanProvider>
  );
}
