"use client";

import { request } from "@/core/request";
import type {
  BoardData,
  BoardMetricsDTO,
  CardDetailDTO,
  CardsPage,
  KanbanCommand,
  KanbanMutationResult,
  TaskRefDTO,
} from "./types";

// Chamadas HTTP do módulo Kanban — mesma origem (/api/kanban/...), sem BFF.
// Fetches falham para `null`/`[]` (o mesmo contrato que as antigas server
// actions ofereciam aos componentes); mutações devolvem o envelope
// KanbanMutationResult, que já cobre erro sem lançar.

export const kanbanClient = {
  snapshot: (boardId: string): Promise<BoardData | null> =>
    request<BoardData>(`/kanban/boards/${boardId}`).catch(() => null),

  boardForWorkspace: (workspaceId: string): Promise<BoardData | null> =>
    request<BoardData>(`/kanban/workspaces/${workspaceId}/board`).catch(() => null),

  cardDetail: (cardId: string): Promise<CardDetailDTO | null> =>
    request<CardDetailDTO>(`/kanban/cards/${cardId}/detail`).catch(() => null),

  cardBoard: (cardId: string): Promise<BoardData | null> =>
    request<BoardData>(`/kanban/cards/${cardId}/board`).catch(() => null),

  metrics: (boardId: string): Promise<BoardMetricsDTO | null> =>
    request<BoardMetricsDTO>(`/kanban/boards/${boardId}/metrics`).catch(() => null),

  /** Próxima página de cards de uma coluna — "carregar mais" no board. */
  columnCards: (columnId: string, afterId?: string): Promise<CardsPage> =>
    request<CardsPage>(
      afterId
        ? `/kanban/columns/${columnId}/cards?after=${encodeURIComponent(afterId)}`
        : `/kanban/columns/${columnId}/cards`,
    ).catch(() => ({ items: [], hasMore: false })),

  command: (command: KanbanCommand): Promise<KanbanMutationResult> =>
    request<KanbanMutationResult>(`/kanban/commands`, { method: "POST", body: command }).catch((error: unknown) => ({
      ok: false,
      error: error instanceof Error ? error.message : "Erro inesperado",
    })),

  /** Busca tarefas do workspace p/ a menção `!` no chat. */
  searchTasks: (workspaceId: string, query: string): Promise<TaskRefDTO[]> =>
    request<TaskRefDTO[]>(`/kanban/workspaces/${workspaceId}/cards/search?q=${encodeURIComponent(query ?? "")}`).catch(
      () => [],
    ),
};
