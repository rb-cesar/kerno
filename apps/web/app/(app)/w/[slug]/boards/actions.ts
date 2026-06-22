"use server";

import type {
  BoardData,
  BoardMetricsDTO,
  CardDetailDTO,
  KanbanCommand,
  KanbanMutationResult,
  TaskRefDTO,
} from "@kerno/kanban/types";
import { apiFetch } from "@/lib/api-client";

// BFF: a fronteira (auth + permissão + services) agora vive na API (NestJS).
// Estes actions só repassam para os endpoints do hub Kanban.

export async function kanbanFetch(boardId: string): Promise<BoardData | null> {
  return apiFetch<BoardData>(`/kanban/boards/${boardId}`).catch(() => null);
}

export async function kanbanFetchCardDetail(cardId: string): Promise<CardDetailDTO | null> {
  return apiFetch<CardDetailDTO>(`/kanban/cards/${cardId}/detail`).catch(() => null);
}

export async function kanbanFetchMetrics(boardId: string): Promise<BoardMetricsDTO | null> {
  return apiFetch<BoardMetricsDTO>(`/kanban/boards/${boardId}/metrics`).catch(() => null);
}

export async function kanbanMutate(command: KanbanCommand): Promise<KanbanMutationResult> {
  return apiFetch<KanbanMutationResult>(`/kanban/commands`, {
    method: "POST",
    body: JSON.stringify(command),
  }).catch((error: unknown) => ({
    ok: false,
    error: error instanceof Error ? error.message : "Erro inesperado",
  }));
}

/** Busca tarefas do workspace p/ a menção `!` no chat. */
export async function kanbanSearchTasks(
  workspaceId: string,
  query: string,
): Promise<TaskRefDTO[]> {
  const q = encodeURIComponent(query ?? "");
  return apiFetch<TaskRefDTO[]>(
    `/kanban/workspaces/${workspaceId}/cards/search?q=${q}`,
  ).catch(() => []);
}

/** Snapshot do board que contém um card — abre o painel da tarefa no chat. */
export async function kanbanFetchCardBoard(cardId: string): Promise<BoardData | null> {
  return apiFetch<BoardData>(`/kanban/cards/${cardId}/board`).catch(() => null);
}
