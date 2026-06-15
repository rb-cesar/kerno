"use client";

import { useCallback, useMemo, useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import type { Socket } from "socket.io-client";
import type { BoardData, KanbanFetch, KanbanMutate } from "../types";
import { useKanbanRealtime } from "../hooks/use-kanban-realtime";
import { KanbanProvider } from "./kanban-context";
import { KanbanColumn } from "./kanban-column";
import { AddColumn } from "./add-column";
import { KanbanSidebar } from "./kanban-sidebar";

function toggleInSet(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

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
  const [labelFilter, setLabelFilter] = useState<Set<string>>(new Set());
  const [assigneeFilter, setAssigneeFilter] = useState<Set<string>>(new Set());

  const filtersActive = labelFilter.size > 0 || assigneeFilter.size > 0;

  const visibleColumns = useMemo(() => {
    if (!filtersActive) return data.columns;
    return data.columns.map((col) => ({
      ...col,
      cards: col.cards.filter((card) => {
        const labelOk =
          labelFilter.size === 0 || card.labels.some((l) => labelFilter.has(l.id));
        const assigneeOk =
          assigneeFilter.size === 0 ||
          (card.assignedTo != null && assigneeFilter.has(card.assignedTo));
        return labelOk && assigneeOk;
      }),
    }));
  }, [data.columns, filtersActive, labelFilter, assigneeFilter]);

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
      <div className="flex h-full">
        <KanbanSidebar
          boardId={data.id}
          boardName={data.name}
          labels={data.labels}
          members={data.members}
          labelFilter={labelFilter}
          assigneeFilter={assigneeFilter}
          onToggleLabel={(id) => setLabelFilter((prev) => toggleInSet(prev, id))}
          onToggleAssignee={(id) => setAssigneeFilter((prev) => toggleInSet(prev, id))}
          onClear={() => {
            setLabelFilter(new Set());
            setAssigneeFilter(new Set());
          }}
        />
        <div className="flex h-full min-w-0 flex-1 flex-col">
          {filtersActive ? (
            <div className="border-b bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground">
              Arrastar desativado enquanto há filtros ativos.
            </div>
          ) : null}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex flex-1 gap-4 overflow-x-auto px-4 py-4">
              {visibleColumns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  dragDisabled={filtersActive}
                />
              ))}
              <AddColumn boardId={data.id} />
            </div>
          </DragDropContext>
        </div>
      </div>
    </KanbanProvider>
  );
}
