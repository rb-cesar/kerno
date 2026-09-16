"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton, TooltipProvider } from "@kerno/ui";
import type { BoardData, KanbanFetch, KanbanFetchCardDetail, KanbanMutate } from "../types";
import { KanbanProvider } from "./kanban-context";
import { CardPanelContent } from "./card-dialog";

/**
 * Conteúdo de uma tarefa para uso FORA do board (ex.: como aba do dock no chat).
 * Self-contained: busca o snapshot do board que contém o card + monta um contexto
 * Kanban compatível e renderiza o mesmo `CardPanelContent` do board (máximo reuso).
 * Não tem shell próprio — quem provê a moldura (borda/abas/largura) é o dock.
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
  const [shownCardId, setShownCardId] = useState<string>(cardId);
  const [remoteRev, setRemoteRev] = useState(0);

  // Carrega o board do card ao montar / trocar de tarefa.
  useEffect(() => {
    let active = true;
    setData(null);
    setShownCardId(cardId);
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

  // Navegação interna (ex.: clicar numa sub-tarefa) troca o card mostrado nesta aba.
  const openCard = useCallback((id: string) => setShownCardId(id), []);

  if (!data) {
    return (
      <div className="flex h-full flex-col gap-4 p-5">
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const card = data.columns.flatMap((c) => c.cards).find((c) => c.id === shownCardId) ?? null;

  if (!card) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-sm text-muted-foreground">
        Tarefa não encontrada.
        <button type="button" onClick={onClose} className="text-primary underline">
          Fechar
        </button>
      </div>
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
        openCard,
        activeCardId: shownCardId,
      }}
    >
      <TooltipProvider delayDuration={200}>
        <CardPanelContent key={card.id} card={card} onClose={onClose} />
      </TooltipProvider>
    </KanbanProvider>
  );
}
