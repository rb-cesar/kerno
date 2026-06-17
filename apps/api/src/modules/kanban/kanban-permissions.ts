import { ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  projectIdOfBoard,
  projectIdOfCard,
  projectIdOfColumn,
  projectIdOfLabel,
} from "@kerno/kanban/services";
import { getProjectMembership } from "@kerno/core/workspaces";

/**
 * Porta da camada de permissão do app (antes em apps/web/lib/kanban-guard.ts)
 * para o backend. Resolve o projeto dono do recurso e exige membership.
 */
export async function assertMember(userId: string, projectId: string | null): Promise<void> {
  if (!projectId) throw new NotFoundException("Recurso não encontrado");
  const membership = await getProjectMembership(userId, projectId);
  if (!membership) throw new ForbiddenException("Você não tem acesso a este projeto");
}

export const guardBoard = async (userId: string, boardId: string) =>
  assertMember(userId, await projectIdOfBoard(boardId));
export const guardColumn = async (userId: string, columnId: string) =>
  assertMember(userId, await projectIdOfColumn(columnId));
export const guardCard = async (userId: string, cardId: string) =>
  assertMember(userId, await projectIdOfCard(cardId));
export const guardLabel = async (userId: string, labelId: string) =>
  assertMember(userId, await projectIdOfLabel(labelId));
