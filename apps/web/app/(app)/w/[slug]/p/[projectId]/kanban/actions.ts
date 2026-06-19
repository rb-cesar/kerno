"use server";

import type {
  BoardData,
  BoardMetricsDTO,
  CardDetailDTO,
  KanbanCommand,
  KanbanMutationResult,
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
