"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton, TooltipProvider } from "@kerno/ui";
import type { BoardData, KanbanFetch, KanbanFetchCardDetail, KanbanMutate } from "../types";
import { KanbanProvider } from "./kanban-context";
import { CardDialog } from "./card-dialog";

/**
 * Painel lateral de uma tarefa, REUTILIZÁVEL fora do board (ex.: ao lado do chat
 * quando se clica numa menção `!`). É self-contained: busca o snapshot do board que
 * contém o card + monta um contexto Kanban compatível e renderiza o mesmo
 * `CardDialog` do board (máximo reuso). As chamadas à API chegam por props (a
 * composição com o app evita o hub Chat importar o hub Kanban).
 */
export function TaskSidePanel({
  cardId,
  currentUserId,
  mutate,
  fetchCardBoard,
  fetchSnapshot,
  fetchCardDetail,
  onClose,
}: {
  cardId: string;
  currentUserId: string;
  mutate: KanbanMutate;
  /** Snapshot do board que contém o card (GET /kanban/cards/:id/board). */
  fetchCardBoard: (cardId: string) => Promise<BoardData | null>;
  /** Snapshot por boardId — usado pelo refresh após mutações. */
  fetchSnapshot: KanbanFetch;
  fetchCardDetail: KanbanFetchCardDetail;
  onClose: () => void;
}) {
  const [data, setData] = useState<BoardData | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(cardId);
  const [remoteRev, setRemoteRev] = useState(0);

  // Carrega o board do card ao abrir / trocar de tarefa.
  useEffect(() => {
    let active = true;
    setData(null);
    setOpenCardId(cardId);
    void fetchCardBoard(cardId).then((board) => {
      if (active && board) setData(board);
    });
    return () => {
      active = false;
    };
  }, [cardId, fetchCardBoard]);

  const refresh = useCallback(async () => {
    if (!data) return;
    const fresh = await fetchSnapshot(data.id);
    if (fresh) {
      setData(fresh);
      setRemoteRev((r) => r + 1);
    }
  }, [data, fetchSnapshot]);

  if (!data) {
    return (
      <aside className="flex h-full w-[44rem] min-w-[28rem] max-w-[60vw] shrink-0 flex-col gap-4 border-l bg-background p-5">
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
      </aside>
    );
  }

  const card = data.columns.flatMap((c) => c.cards).find((c) => c.id === openCardId) ?? null;

  if (!card) {
    return (
      <aside className="flex h-full w-[28rem] shrink-0 flex-col items-center justify-center gap-3 border-l bg-background p-5 text-sm text-muted-foreground">
        Tarefa não encontrada.
        <button type="button" onClick={onClose} className="text-primary underline">
          Fechar
        </button>
      </aside>
    );
  }

  return (
    <KanbanProvider
      value={{
        mutate,
        refresh,
        fetchCardDetail,
        currentUserId,
        workspaceKey: data.workspaceKey,
        members: data.members,
        labels: data.labels,
        cycles: data.cycles,
        stories: data.stories,
        remoteRev,
        openCardId,
        setOpenCardId,
      }}
    >
      <TooltipProvider delayDuration={200}>
        <CardDialog card={card} onClose={onClose} />
      </TooltipProvider>
    </KanbanProvider>
  );
}
