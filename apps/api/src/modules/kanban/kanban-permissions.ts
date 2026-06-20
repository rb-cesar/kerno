import { ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  cardIdOfChecklist,
  cardIdOfChecklistItem,
  cardIdOfComment,
  workspaceIdOfBoard,
  workspaceIdOfCard,
  workspaceIdOfColumn,
  workspaceIdOfCycle,
  workspaceIdOfLabel,
  workspaceIdOfStory,
} from "@kerno/kanban/services";
import { getWorkspaceMembership } from "@kerno/core/workspaces";

/**
 * Porta da camada de permissão do app (antes em apps/web/lib/kanban-guard.ts)
 * para o backend. Resolve o workspace dono do recurso e exige membership.
 */
export async function assertMember(userId: string, workspaceId: string | null): Promise<void> {
  if (!workspaceId) throw new NotFoundException("Recurso não encontrado");
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) throw new ForbiddenException("Você não tem acesso a este workspace");
}

export const guardBoard = async (userId: string, boardId: string) =>
  assertMember(userId, await workspaceIdOfBoard(boardId));
export const guardColumn = async (userId: string, columnId: string) =>
  assertMember(userId, await workspaceIdOfColumn(columnId));
export const guardCard = async (userId: string, cardId: string) =>
  assertMember(userId, await workspaceIdOfCard(cardId));
export const guardLabel = async (userId: string, labelId: string) =>
  assertMember(userId, await workspaceIdOfLabel(labelId));
export const guardCycle = async (userId: string, cycleId: string) =>
  assertMember(userId, await workspaceIdOfCycle(cycleId));
export const guardStory = async (userId: string, storyId: string) =>
  assertMember(userId, await workspaceIdOfStory(storyId));
export async function guardComment(userId: string, commentId: string): Promise<void> {
  const cardId = await cardIdOfComment(commentId);
  if (!cardId) throw new NotFoundException("Comentário não encontrado");
  await guardCard(userId, cardId);
}
export async function guardChecklist(userId: string, checklistId: string): Promise<void> {
  const cardId = await cardIdOfChecklist(checklistId);
  if (!cardId) throw new NotFoundException("Checklist não encontrada");
  await guardCard(userId, cardId);
}
export async function guardChecklistItem(userId: string, itemId: string): Promise<void> {
  const cardId = await cardIdOfChecklistItem(itemId);
  if (!cardId) throw new NotFoundException("Item não encontrado");
  await guardCard(userId, cardId);
}
