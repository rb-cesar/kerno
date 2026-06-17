"use server";

import type { BoardData, KanbanCommand, KanbanMutationResult } from "@kerno/kanban/types";
import { apiFetch } from "@/lib/api-client";

// BFF: a fronteira (auth + permissão + services) agora vive na API (NestJS).
// Estes actions só repassam para os endpoints do hub Kanban.

export async function kanbanFetch(boardId: string): Promise<BoardData | null> {
  return apiFetch<BoardData>(`/kanban/boards/${boardId}`).catch(() => null);
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
